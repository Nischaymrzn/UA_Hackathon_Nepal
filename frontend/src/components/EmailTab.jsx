import React, { useState, useCallback, useRef } from "react";
import { validateEmail, sendOtp, verifyOtp } from "../api.js";
import ResultCard from "./ResultCard.jsx";

const G = "#16a34a";

const SAMPLES = [
  "राम@नेपाल.नेपाल",
  "سارة@مثال.إختبار",
  "用户@例子.广告",
  "user@example.com",
  "@नेपाल.नेपाल",
  ".user@example.com",
];

// OTP state machine: idle → sending → sent → verifying → verified | failed
const IDLE       = "idle";
const SENDING    = "sending";
const SENT       = "sent";
const VERIFYING  = "verifying";
const VERIFIED   = "verified";
const FAILED     = "failed";

export default function EmailTab() {
  const [value,      setValue]      = useState("");
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  const [otpState,   setOtpState]   = useState(IDLE);
  const [otpError,   setOtpError]   = useState(null);
  const [code,       setCode]       = useState("");

  const codeRef = useRef(null);

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = useCallback(async (v) => {
    const t = (v ?? value).trim();
    setLoading(true); setError(null);
    setResult(null); setOtpState(IDLE); setOtpError(null); setCode("");
    try { setResult(await validateEmail(t)); }
    catch { setError("Backend not reachable."); }
    finally { setLoading(false); }
  }, [value]);

  // ── Send OTP ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    setOtpState(SENDING); setOtpError(null);
    try {
      const res = await sendOtp(value.trim());
      if (res.sent) {
        setOtpState(SENT);
        setTimeout(() => codeRef.current?.focus(), 50);
      } else {
        setOtpError(res.error || "Failed to send.");
        setOtpState(IDLE);
      }
    } catch {
      setOtpError("Backend not reachable.");
      setOtpState(IDLE);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (code.length !== 6) return;
    setOtpState(VERIFYING); setOtpError(null);
    try {
      const res = await verifyOtp(value.trim(), code);
      setOtpState(res.verified ? VERIFIED : FAILED);
      if (!res.verified) setOtpError(res.error || "Incorrect code.");
    } catch {
      setOtpState(FAILED);
      setOtpError("Backend not reachable.");
    }
  };

  const reset = () => {
    setOtpState(IDLE); setOtpError(null); setCode("");
  };

  const isValid = result?.valid;

  return (
    <div>
      {/* ── Input row ── */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text" dir="auto"
          placeholder="email@domain.com"
          value={value}
          onChange={e => {
            setValue(e.target.value);
            setResult(null); setError(null);
            setOtpState(IDLE); setOtpError(null); setCode("");
          }}
          onKeyDown={e => e.key === "Enter" && validate()}
          style={{
            flex: 1, padding: "9px 12px",
            border: "1px solid #d1d5db", borderRadius: 6,
            outline: "none", fontSize: 15,
          }}
          onFocus={e => e.target.style.borderColor = G}
          onBlur={e  => e.target.style.borderColor = "#d1d5db"}
        />
        <button onClick={() => validate()} disabled={loading} style={{
          padding: "9px 20px", background: G, color: "#fff",
          border: "none", borderRadius: 6, fontWeight: 600,
          opacity: loading ? 0.6 : 1,
        }}>
          {loading ? <><span className="spinner" />Checking</> : "Validate"}
        </button>
      </div>

      {/* ── Samples ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {SAMPLES.map(s => (
          <button key={s} dir="auto"
            onClick={() => { setValue(s); validate(s); }}
            style={{
              padding: "4px 10px", background: "#f5f5f5",
              border: "1px solid #e5e5e5", borderRadius: 4,
              color: "#444", fontSize: 13,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = G}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e5e5"}>
            {s}
          </button>
        ))}
      </div>

      {error && <p style={{ marginTop: 14, color: "#111", fontSize: 13 }}>✗ {error}</p>}

      {/* ── Validation result ── */}
      <ResultCard result={result} kind="email" />

      {/* ── OTP section — only shown when email is valid ── */}
      {isValid && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e5e5e5" }}>

          {/* VERIFIED */}
          {otpState === VERIFIED && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: G, fontWeight: 700, fontSize: 15 }}>✓ Email verified</span>
              <button onClick={reset} style={{ fontSize: 12, color: "#aaa", background: "none", border: "none", cursor: "pointer" }}>
                verify again
              </button>
            </div>
          )}

          {/* IDLE — show Send button */}
          {otpState === IDLE && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={handleSend} style={{
                padding: "8px 18px", background: "#fff",
                border: `1px solid ${G}`, borderRadius: 6,
                color: G, fontWeight: 600, fontSize: 13,
              }}>
                Send verification code
              </button>
              {otpError && <span style={{ fontSize: 13, color: "#111" }}>✗ {otpError}</span>}
            </div>
          )}

          {/* SENDING */}
          {otpState === SENDING && (
            <span style={{ fontSize: 13, color: "#888" }}>
              <span className="spinner" />Sending code to {value.trim()}…
            </span>
          )}

          {/* SENT / VERIFYING / FAILED — show code input */}
          {(otpState === SENT || otpState === VERIFYING || otpState === FAILED) && (
            <div>
              <p style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
                Code sent to <strong dir="auto">{value.trim()}</strong> — check your inbox.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setOtpError(null); if (otpState === FAILED) setOtpState(SENT); }}
                  onKeyDown={e => e.key === "Enter" && handleVerify()}
                  style={{
                    width: 140, padding: "8px 12px",
                    border: `1px solid ${otpState === FAILED ? "#d1d5db" : "#d1d5db"}`,
                    borderRadius: 6, fontSize: 18, letterSpacing: 6,
                    outline: "none", textAlign: "center",
                  }}
                  onFocus={e => e.target.style.borderColor = G}
                  onBlur={e  => e.target.style.borderColor = "#d1d5db"}
                />
                <button
                  onClick={handleVerify}
                  disabled={code.length !== 6 || otpState === VERIFYING}
                  style={{
                    padding: "8px 18px", background: G, color: "#fff",
                    border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13,
                    opacity: code.length !== 6 || otpState === VERIFYING ? 0.5 : 1,
                  }}>
                  {otpState === VERIFYING ? <><span className="spinner" />Verifying</> : "Verify"}
                </button>
                <button onClick={handleSend} style={{ fontSize: 12, color: "#aaa", background: "none", border: "none", cursor: "pointer" }}>
                  resend
                </button>
              </div>
              {otpError && (
                <p style={{ marginTop: 8, fontSize: 13, color: "#111" }}>✗ {otpError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
