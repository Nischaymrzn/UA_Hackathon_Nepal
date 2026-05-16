import React, { useState, useCallback } from "react";
import { validateDomain, lookupMX } from "../api.js";
import ResultCard from "./ResultCard.jsx";

const G = "#16a34a";

const SAMPLES = [
  "नेपाल.नेपाल",
  "مثال.إختبار",
  "例子.广告",
  "example.com",
  "-bad.com",
  "has..dots.com",
];

export default function DomainTab() {
  const [value,     setValue]     = useState("");
  const [result,    setResult]    = useState(null);
  const [mx,        setMx]        = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [mxLoading, setMxLoading] = useState(false);
  const [error,     setError]     = useState(null);

  const validate = useCallback(async (v) => {
    const t = (v ?? value).trim();
    setLoading(true); setError(null); setMx(null);
    try {
      const r = await validateDomain(t);
      setResult(r);
      if (r.valid && r.info.aceForm) {
        setMxLoading(true);
        lookupMX(r.info.aceForm).then(setMx).catch(() => setMx({ error: "lookup failed" })).finally(() => setMxLoading(false));
      }
    } catch { setError("Backend not reachable."); }
    finally { setLoading(false); }
  }, [value]);

  return (
    <div>
      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text" dir="auto"
          placeholder="domain.com"
          value={value}
          onChange={e => { setValue(e.target.value); setResult(null); setMx(null); setError(null); }}
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

      <ResultCard result={result} kind="domain" />

      {/* MX lookup */}
      {result && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e5e5" }}>
          <span style={{ fontSize: 12, color: "#888" }}>MX records</span>
          <div style={{ marginTop: 6, fontSize: 13 }}>
            {mxLoading
              ? <span style={{ color: "#888" }}><span className="spinner" />looking up…</span>
              : mx?.error
              ? <span style={{ color: "#888" }}>lookup failed</span>
              : mx?.hasRecords
              ? mx.records.map((r, i) => <div key={i} style={{ color: G }}>✓ {r}</div>)
              : mx
              ? <span style={{ color: "#888" }}>no MX records found</span>
              : null
            }
          </div>
        </div>
      )}
    </div>
  );
}
