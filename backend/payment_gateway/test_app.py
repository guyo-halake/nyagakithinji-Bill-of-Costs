import unittest
from decimal import Decimal

from fastapi import HTTPException

from backend.payment_gateway.app import PromptRequest, normalize_phone


class PaymentGatewayInputTests(unittest.TestCase):
    def test_normalizes_local_and_international_kenyan_numbers(self):
        self.assertEqual(normalize_phone("0712 345 678"), "+254712345678")
        self.assertEqual(normalize_phone("+254 112 345 678"), "+254112345678")

    def test_rejects_non_kenyan_or_invalid_numbers(self):
        with self.assertRaises(HTTPException):
            normalize_phone("555-0100")

    def test_payment_amount_is_decimal(self):
        request = PromptRequest(
            firm_id="12345678-1234-1234-1234-123456789012",
            description="Fee note settlement",
            phone_number="0712345678",
            client_email="client@example.com",
            amount="1200.50",
        )
        self.assertEqual(request.amount, Decimal("1200.50"))


if __name__ == "__main__":
    unittest.main()
