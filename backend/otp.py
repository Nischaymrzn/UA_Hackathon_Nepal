"""In-memory OTP store — single-use, 10-minute TTL."""

import secrets
import time

_store: dict = {}   # { email: { code, expires } }
OTP_TTL = 600       # seconds


def create(email: str) -> str:
    code = str(secrets.randbelow(1_000_000)).zfill(6)
    _store[email] = {"code": code, "expires": time.time() + OTP_TTL}
    return code


def verify(email: str, code: str) -> bool:
    entry = _store.get(email)
    if not entry:
        return False
    if time.time() > entry["expires"]:
        _store.pop(email, None)
        return False
    if entry["code"] != code.strip():
        return False
    _store.pop(email)   # single-use
    return True


def has_pending(email: str) -> bool:
    entry = _store.get(email)
    if not entry:
        return False
    if time.time() > entry["expires"]:
        _store.pop(email, None)
        return False
    return True
