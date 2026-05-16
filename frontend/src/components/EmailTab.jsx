import React, { useState, useCallback } from "react";
import { validateEmail, sendConfirmation } from "../api.js";
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

export default function EmailTab() {
  const [value,    setValue]    = useState("");
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [sendErr,  setSendErr]  = useState(null);

  const validate = useCallback(async (v) => {
    const t = (v ?? value).trim();
    setLoading(true); setError(null);
    setResult(null); setSent(false); setSendErr(null);
    try { setResult(await validateEmail(t)); }
    catch { setError("Backend not reachable."); }
    finally { setLoading(false); }
  }, [value]);

  const handleSend = async () => {
    setSending(true); setSendErr(null); setSent(false);
    try {
      const res = await sendConfirmation(value.trim());
      if (res.sent) setSent(true);
      else setSendErr(res.error || "Failed to send.");
    } catch {
      setSendErr("Backend not reachable.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text" dir="auto"
          placeholder="email@domain.com"
          value={value}
          onChange={e => {
            setValue(e.target.value);
            setResult(null); setError(null); setSent(false); setSendErr(null);
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

      {/* Samples */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {SAMPLES.map(s => (
          <button key={s} dir="auto" onClick={() => { setValue(s); validate(s); }} style={{
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

      <ResultCard result={result} kind="email" />

      {/* Send confirmation — only when valid */}
      {result?.valid && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e5e5", display: "flex", alignItems: "center", gap: 14 }}>
          {sent ? (
            <span style={{ color: G, fontWeight: 600, fontSize: 14 }}>
              ✓ Confirmation sent — check your inbox
            </span>
          ) : (
            <button onClick={handleSend} disabled={sending} style={{
              padding: "8px 18px", background: "#fff",
              border: `1px solid ${G}`, borderRadius: 6,
              color: G, fontWeight: 600, fontSize: 13,
              opacity: sending ? 0.6 : 1,
            }}>
              {sending ? <><span className="spinner" />Sending…</> : "Send confirmation email"}
            </button>
          )}
          {sendErr && <span style={{ fontSize: 13, color: "#111" }}>✗ {sendErr}</span>}
        </div>
      )}
    </div>
  );
}
