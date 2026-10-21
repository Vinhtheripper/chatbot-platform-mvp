import os
import secrets
from fastapi import Header, HTTPException


def require_admin(authorization: str | None = Header(default=None)):
    expected = os.getenv("ADMIN_TOKEN")
    if not expected:
        raise HTTPException(503, "Cần đặt ADMIN_TOKEN trên backend trước khi dùng admin.")
    if not secrets.compare_digest(authorization or "", f"Bearer {expected}"):
        raise HTTPException(401, "Admin token không hợp lệ")
