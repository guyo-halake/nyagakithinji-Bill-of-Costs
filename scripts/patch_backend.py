import os
import httpx

backend_path = r"c:\Users\guyoh\Desktop\NYAGA LAW DEVOPS\app\api\users.py"
with open(backend_path, "r", encoding="utf-8") as f:
    content = f.read()

target_str = """async def upsert_user_in_supabase(user_data: dict):"""

sync_func = """async def sync_supabase_auth_credentials(email: str, raw_password: str):
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key or not email or not raw_password:
        return
    try:
        clean_email = email.strip().lower()
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            list_res = await client.get(f"{url}/auth/v1/admin/users", headers=headers)
            if list_res.status_code == 200:
                auth_users = list_res.json().get("users", [])
                matched = next((u for u in auth_users if (u.get("email") or "").lower() == clean_email), None)
                if matched:
                    uid = matched["id"]
                    await client.put(f"{url}/auth/v1/admin/users/{uid}", headers=headers, json={"password": raw_password})
                    print(f"INFO: [SUPABASE AUTH SYNC] Password updated in Supabase Auth for {clean_email}")
                else:
                    await client.post(f"{url}/auth/v1/admin/users", headers=headers, json={
                        "email": clean_email,
                        "password": raw_password,
                        "email_confirm": True
                    })
                    print(f"INFO: [SUPABASE AUTH SYNC] Provisioned {clean_email} in Supabase Auth")
    except Exception as e:
        print(f"[SUPABASE AUTH SYNC ERROR]: {e}")

async def upsert_user_in_supabase(user_data: dict):"""

if target_str in content and "sync_supabase_auth_credentials" not in content:
    content = content.replace(target_str, sync_func, 1)

old_hash_logic = """        if raw_pwd.startswith("$2b$") or raw_pwd.startswith("$2a$"):
            new_password_hash = raw_pwd
        else:
            new_password_hash = hash_password(raw_pwd)"""

new_hash_logic = """        if raw_pwd.startswith("$2b$") or raw_pwd.startswith("$2a$"):
            new_password_hash = raw_pwd
        else:
            new_password_hash = hash_password(raw_pwd)
            try:
                await sync_supabase_auth_credentials(email_clean, raw_pwd)
            except Exception as _e:
                print(f"[AUTH SYNC ERROR]: {_e}")"""

if old_hash_logic in content:
    content = content.replace(old_hash_logic, new_hash_logic, 1)

with open(backend_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated backend users.py successfully!")
