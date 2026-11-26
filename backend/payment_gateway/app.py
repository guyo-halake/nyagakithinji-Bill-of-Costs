import hashlib
import hmac
import json
import os
import re
import uuid
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Optional

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field

app = FastAPI(title="Karani Law Payment Gateway")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_API_URL = "https://api.paystack.co"


class PromptRequest(BaseModel):
    firm_id: str
    fee_note_id: Optional[str] = None
    description: str = Field(min_length=1, max_length=500)
    phone_number: str = Field(min_length=7, max_length=30)
    client_email: str
    amount: Decimal = Field(gt=0)


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if digits.startswith("0"):
        digits = "254" + digits[1:]
    elif digits.startswith("7") or digits.startswith("1"):
        digits = "254" + digits
    if not re.fullmatch(r"254[17]\d{8}", digits):
        raise HTTPException(status_code=422, detail="Enter a valid Kenyan mobile number.")
    return "+" + digits


def configured() -> None:
    if not all((SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)):
        raise HTTPException(status_code=503, detail="Payment records are not configured on the server.")
    if not PAYSTACK_SECRET_KEY or not PAYSTACK_SECRET_KEY.startswith("sk_"):
        raise HTTPException(status_code=503, detail="Paystack is not configured on the server.")


def supabase_headers(token: str) -> dict[str, str]:
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


async def update_payment(payment_id: str, values: dict, service_role: bool = False) -> None:
    key = SUPABASE_SERVICE_ROLE_KEY if service_role else SUPABASE_ANON_KEY
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key if service_role else values.pop('_access_token')}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.patch(
            f"{SUPABASE_URL}/rest/v1/payments?id=eq.{payment_id}",
            headers=headers,
            json=values,
        )
    if response.is_error:
        raise HTTPException(status_code=502, detail="The payment record could not be updated.")


@app.post("/charge")
async def send_prompt(payload: PromptRequest, authorization: Optional[str] = Header(default=None)):
    configured()
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in again before sending a payment prompt.")
    if not re.fullmatch(r"[0-9a-fA-F-]{36}", payload.firm_id):
        raise HTTPException(status_code=422, detail="The firm account could not be verified.")
    email = payload.client_email.strip()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=422, detail="Enter a valid client email address.")
    amount = payload.amount.quantize(Decimal("0.01"))
    if amount != payload.amount:
        raise HTTPException(status_code=422, detail="Enter an amount with no more than two decimal places.")

    token = authorization.removeprefix("Bearer ").strip()
    phone = normalize_phone(payload.phone_number)
    payment_id = str(uuid.uuid4())
    reference = f"KL-{payment_id}"
    headers = supabase_headers(token)

    async with httpx.AsyncClient(timeout=15) as client:
        auth_response = await client.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers)
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Your sign-in could not be verified.")
        user = auth_response.json()

        if payload.fee_note_id:
            note_response = await client.get(
                f"{SUPABASE_URL}/rest/v1/fee_notes",
                headers=headers,
                params={
                    "id": f"eq.{payload.fee_note_id}",
                    "firm_id": f"eq.{payload.firm_id}",
                    "select": "id",
                    "limit": "1",
                },
            )
            if note_response.status_code != 200 or not note_response.json():
                raise HTTPException(status_code=404, detail="That fee note is not available in this firm.")

        payment = {
            "id": payment_id,
            "firm_id": payload.firm_id,
            "fee_note_id": payload.fee_note_id,
            "amount": str(amount),
            "payment_date": date.today().isoformat(),
            "reference": reference,
            "status": "pending",
            "received_by": user.get("id"),
            "payment_method": "paystack",
            "description": payload.description.strip(),
            "phone_number": phone,
            "client_email": email,
            "provider_reference": reference,
        }
        insert_response = await client.post(
            f"{SUPABASE_URL}/rest/v1/payments",
            headers={**headers, "Prefer": "return=minimal"},
            json=payment,
        )
        if insert_response.is_error:
            raise HTTPException(
                status_code=403,
                detail="The payment could not be saved. Check your payment permission and database migration.",
            )

        try:
            paystack_response = await client.post(
                f"{PAYSTACK_API_URL}/charge",
                headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
                json={
                    "email": email,
                    "amount": int(amount * 100),
                    "currency": "KES",
                    "mobile_money": {"phone": phone, "provider": "mpesa"},
                    "reference": reference,
                    "metadata": {
                        "payment_id": payment_id,
                        "firm_id": payload.firm_id,
                        "fee_note_id": payload.fee_note_id,
                    },
                },
            )
        except httpx.HTTPError as error:
            await update_payment(payment_id, {"status": "reversed", "_access_token": token})
            raise HTTPException(status_code=502, detail="Paystack could not be reached. No prompt was sent.") from error

    result = paystack_response.json()
    if paystack_response.is_error or not result.get("status"):
        await update_payment(payment_id, {"status": "reversed", "_access_token": token})
        message = result.get("message") or "Paystack could not send the payment prompt."
        raise HTTPException(status_code=502, detail=message)
    return {"success": True, "status": "pending", "reference": reference}


@app.post("/webhook")
async def paystack_webhook(request: Request, x_paystack_signature: Optional[str] = Header(default=None)):
    if not PAYSTACK_SECRET_KEY or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=503, detail="Payment confirmation is not configured.")
    body = await request.body()
    expected = hmac.new(PAYSTACK_SECRET_KEY.encode(), body, hashlib.sha512).hexdigest()
    if not x_paystack_signature or not hmac.compare_digest(expected, x_paystack_signature):
        raise HTTPException(status_code=401, detail="Invalid payment signature.")

    event = json.loads(body)
    if event.get("event") != "charge.success":
        return {"received": True}
    reference = event.get("data", {}).get("reference", "")
    if not isinstance(reference, str) or not reference.startswith("KL-"):
        return {"received": True}
    payment_id = reference.removeprefix("KL-")
    if not re.fullmatch(r"[0-9a-fA-F-]{36}", payment_id):
        return {"received": True}

    service_key = SUPABASE_SERVICE_ROLE_KEY
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        payment_response = await client.get(
            f"{SUPABASE_URL}/rest/v1/payments",
            headers=headers,
            params={"id": f"eq.{payment_id}", "select": "id,amount,status", "limit": "1"},
        )
        if payment_response.is_error or not payment_response.json():
            raise HTTPException(status_code=404, detail="Payment record not found.")
        payment = payment_response.json()[0]
        verification_response = await client.get(
            f"{PAYSTACK_API_URL}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
        )
        verification = verification_response.json()
        details = verification.get("data", {})
        expected_amount = int(Decimal(str(payment["amount"])) * 100)
        if (
            verification_response.is_error
            or not verification.get("status")
            or details.get("status") != "success"
            or details.get("currency") != "KES"
            or details.get("amount") != expected_amount
        ):
            return {"received": True}
        update_response = await client.patch(
            f"{SUPABASE_URL}/rest/v1/payments?id=eq.{payment_id}&status=eq.pending",
            headers={**headers, "Prefer": "return=minimal"},
            json={"status": "confirmed"},
        )
        if update_response.is_error:
            raise HTTPException(status_code=502, detail="Verified payment could not be recorded.")
    return {"received": True}
