# UA Hackathon Nepal — Email & Domain Validator

A full-stack internationalisation validator for email addresses and domain names, built for Hackathon Nepal 2026.

Supports Unicode email (EAI), Devanagari `.नेपाल` domains, Arabic, Chinese, and all IDNA2008 scripts — with live OTP email verification.

---

## Standards implemented

| Standard | Description |
|----------|-------------|
| RFC 6531 | SMTPUTF8 — UTF-8 in email local parts |
| RFC 6532 | Internationalised email headers |
| RFC 5891 | IDNA2008 — Unicode domain labels |
| RFC 5321 | SMTP — size limits and address syntax |
| RFC 1035 | DNS — label and domain length rules |
| UTS#46   | Unicode IDNA compatibility mapping |
| UTS#15   | NFC normalisation (applied first, always) |

---

## Project structure

```
├── backend/
│   ├── main.py          # FastAPI server
│   ├── validator.py     # Validation engine (Adapter / Inspector / Messenger layers)
│   ├── otp.py           # OTP generation and verification
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── components/
│   │       ├── EmailTab.jsx
│   │       ├── DomainTab.jsx
│   │       ├── ResultCard.jsx
│   │       └── TestSuiteTab.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .env                 # Your credentials (not committed)
├── .env.example         # Template
├── start.bat            # One-command start (Windows)
└── start.sh             # One-command start (Mac / Linux)
```

---

## Quick start

### 1. Configure email credentials

```bash
cp .env.example .env
```

Edit `.env` and fill in your Gmail details:

```
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
```

> **Gmail app password:** Google Account → Security → 2-Step Verification → App Passwords → generate one for "Mail".

### 2. Run

**Windows:**
```
start.bat
```

**Mac / Linux:**
```bash
chmod +x start.sh
./start.sh
```

**Manual:**
```bash
# Terminal 1 — backend (Python 3.8+)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend (Node 18+)
cd frontend
npm install
npm run dev
```

### 3. Open

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Frontend |
| http://localhost:8000/docs | Auto-generated API docs |

---

## Features

- **Email Validator** — RFC-cited error messages, EAI detection, ACE/Punycode output, byte counts
- **Domain Validator** — IDN support, live MX lookup via dns.google
- **OTP Verification** — sends a 6-digit code to the validated email, single-use, 10-minute TTL
- **Test Suite** — 20 built-in cases (10 email, 10 domain), runs against the live backend

---

## Requirements

- Python 3.8+
- Node.js 18+
- A Gmail account with an app password (for OTP sending)
