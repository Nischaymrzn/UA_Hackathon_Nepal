import React, { useState } from "react";

const G = "#16a34a";

function Copy({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      style={{ marginLeft: 8, background: "none", border: "none", color: done ? G : "#aaa", fontSize: 12, padding: 0, cursor: "pointer" }}>
      {done ? "copied" : "copy"}
    </button>
  );
}

function Row({ label, value, mono, copy }) {
  return (
    <div style={{ display: "flex", gap: 16, padding: "5px 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ width: 130, flexShrink: 0, color: "#888", fontSize: 12 }}>{label}</span>
      <span style={{ flex: 1, wordBreak: "break-all", fontFamily: mono ? "monospace" : "inherit" }} dir="auto">
        {value || "—"}
        {copy && value && <Copy text={value} />}
      </span>
    </div>
  );
}

export default function ResultCard({ result, kind }) {
  if (!result) return null;
  const { valid, issues, warnings, standards, info } = result;

  return (
    <div style={{ marginTop: 24 }}>

      {/* Status line */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontWeight: 700, color: valid ? G : "#111", fontSize: 15 }}>
          {valid ? "✓ Valid" : "✗ Invalid"}
        </span>
        <span style={{ color: "#aaa", fontSize: 12 }}>{standards.join(" · ")}</span>
      </div>

      {/* Info rows */}
      <Row label="Normalized"    value={info.normalized}  mono copy />
      <Row label="ACE / Punycode" value={info.aceForm}    mono copy />
      <Row label="Scripts"       value={info.scripts?.length ? info.scripts.join(", ") : "ASCII"} />
      {kind === "email" && <>
        <Row label="Local-part bytes" value={`${info.localBytes} / 64`} />
        <Row label="Total bytes"      value={`${info.totalBytes} / 254`} />
        <Row label="EAI"              value={info.isEAI ? "Yes  (RFC 6531 / RFC 6532)" : "No"} />
      </>}
      {kind === "domain" &&
        <Row label="Total chars" value={`${info.normalized?.length ?? 0} / 253`} />
      }
      <Row label="IDN" value={info.isIDN ? "Yes  (IDNA2008 / RFC 5891)" : "No"} />

      {/* Issues */}
      {issues.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {issues.map((iss, i) => (
            <div key={i} style={{ fontSize: 13, color: "#111", padding: "3px 0" }}>✗  {iss}</div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 13, color: "#888", padding: "3px 0" }}>!  {w}</div>
          ))}
        </div>
      )}
    </div>
  );
}
