"""UAReady FastAPI backend — validation, MX proxy, email confirmation."""

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

from validator import validate_email, validate_domain, run_tests

_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(_env_path, override=True)

SMTP_HOST  = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT  = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER  = os.getenv("SMTP_USER", "")
SMTP_PASS  = os.getenv("SMTP_PASS", "")
FROM_NAME  = os.getenv("FROM_NAME", "UA Hackathon Nepal")
FROM_EMAIL = SMTP_USER

app = FastAPI(title="UAReady API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174",
                   "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class EmailRequest(BaseModel):
    email: str

class DomainRequest(BaseModel):
    domain: str

class ConfirmRequest(BaseModel):
    email: str


def _smtp_configured() -> bool:
    return bool(SMTP_USER and SMTP_PASS)


def _send_confirmation(to: str):
    html = textwrap.dedent(f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;font-size:20px;color:#111">UA Hackathon Nepal</h2>
      <p style="margin:0 0 20px;color:#555;font-size:14px">Email validation result</p>
      <div style="font-size:22px;font-weight:700;color:#16a34a;padding:16px 0">
        ✓ Your email is valid
      </div>
      <p style="margin:16px 0 0;color:#555;font-size:14px">
        <strong dir="auto">{to}</strong> passed all RFC 6531 / IDNA2008 checks.
      </p>
      <p style="margin:24px 0 0;color:#999;font-size:12px">
        Sent by UA Hackathon Nepal validator.
      </p>
    </div>
    """)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "✓ Your email is valid — UA Hackathon Nepal"
    msg["From"]    = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"]      = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    # Detect non-ASCII recipient (EAI — RFC 6531)
    is_eai = any(ord(c) > 127 for c in to)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASS)
        if is_eai:
            # SMTPUTF8 extension required for international addresses
            server.sendmail(FROM_EMAIL, to,
                            msg.as_bytes(),
                            mail_options=["SMTPUTF8"])
        else:
            server.sendmail(FROM_EMAIL, to, msg.as_string())


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


@app.post("/api/confirm")
def api_confirm(req: ConfirmRequest):
    if not _smtp_configured():
        return {"sent": False, "error": "SMTP not configured — fill in .env"}

    result = validate_email(req.email)
    if not result["valid"]:
        return {"sent": False, "error": "Email failed validation."}

    try:
        _send_confirmation(req.email)
        return {"sent": True}
    except smtplib.SMTPAuthenticationError:
        return {"sent": False, "error": "SMTP authentication failed — check .env credentials."}
    except Exception as exc:
        return {"sent": False, "error": f"Failed to send: {exc}"}


@app.get("/api/test")
def api_run_tests():
    return run_tests()
