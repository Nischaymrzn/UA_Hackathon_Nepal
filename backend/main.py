"""UAReady FastAPI backend — validation, MX proxy, and OTP email verification."""

import os
import smtplib
import textwrap
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

import otp as otp_store
from validator import validate_email, validate_domain, run_tests

load_dotenv(Path(__file__).parent.parent / ".env")

SMTP_HOST  = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT  = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER  = os.getenv("SMTP_USER", "")
SMTP_PASS  = os.getenv("SMTP_PASS", "")
FROM_NAME  = os.getenv("FROM_NAME", "UA Hackathon Nepal")
FROM_EMAIL = SMTP_USER

app = FastAPI(
    title="UAReady API",
    description="Email and Domain Validation — RFC 6531, RFC 6532, IDNA2008, UTS#46",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────

class EmailRequest(BaseModel):
    email: str

class DomainRequest(BaseModel):
    domain: str

class OtpSendRequest(BaseModel):
    email: str

class OtpVerifyRequest(BaseModel):
    email: str
    code: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _smtp_configured() -> bool:
    return bool(SMTP_USER and SMTP_PASS)


def _send_otp_email(to: str, code: str):
    html = textwrap.dedent(f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;font-size:20px;color:#111">UA Hackathon Nepal</h2>
      <p style="margin:0 0 24px;color:#666;font-size:14px">Email verification code</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#16a34a;
                  border:1px solid #e5e5e5;border-radius:8px;padding:20px;text-align:center">
        {code}
      </div>
      <p style="margin:20px 0 0;color:#999;font-size:12px">
        Expires in 10 minutes. If you did not request this, ignore this email.
      </p>
    </div>
    """)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{code} — UA Hackathon Nepal verification"
    msg["From"]    = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"]      = to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(FROM_EMAIL, to, msg.as_string())


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "UAReady"}


@app.post("/api/validate/email")
def api_validate_email(req: EmailRequest):
    return validate_email(req.email)


@app.post("/api/validate/domain")
def api_validate_domain(req: DomainRequest):
    return validate_domain(req.domain)


@app.get("/api/mx")
async def api_mx_lookup(domain: str = Query(...)):
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(f"https://dns.google/resolve?name={domain}&type=MX")
            data = resp.json()
            records = [a["data"] for a in data.get("Answer", [])]
            return {"domain": domain, "records": records, "hasRecords": len(records) > 0}
    except httpx.TimeoutException:
        return {"domain": domain, "records": [], "hasRecords": False, "error": "DNS lookup timed out"}
    except Exception as exc:
        return {"domain": domain, "records": [], "hasRecords": False, "error": str(exc)}


@app.post("/api/send-otp")
def api_send_otp(req: OtpSendRequest):
    if not _smtp_configured():
        return {
            "sent": False,
            "error": "SMTP not configured. Copy backend/.env.example to backend/.env and fill in your Gmail credentials.",
        }

    result = validate_email(req.email)
    if not result["valid"]:
        return {"sent": False, "error": "Email address failed validation — fix errors first."}

    code = otp_store.create(req.email)
    try:
        _send_otp_email(req.email, code)
        return {"sent": True}
    except smtplib.SMTPAuthenticationError:
        return {"sent": False, "error": "SMTP authentication failed. Check SMTP_USER and SMTP_PASS in backend/.env."}
    except Exception as exc:
        return {"sent": False, "error": f"Failed to send email: {exc}"}


@app.post("/api/verify-otp")
def api_verify_otp(req: OtpVerifyRequest):
    ok = otp_store.verify(req.email, req.code)
    return {"verified": ok, "error": None if ok else "Incorrect or expired code."}


@app.get("/api/test")
def api_run_tests():
    return run_tests()
