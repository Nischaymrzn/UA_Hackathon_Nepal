import React, { useState } from "react";
import { runTests } from "../api.js";

const G = "#16a34a";

export default function TestSuiteTab() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const run = async () => {
    setLoading(true); setError(null); setData(null);
    try { setData(await runTests()); }
    catch { setError("Backend not reachable."); }
    finally { setLoading(false); }
  };

  return (
    <div>
      {/* Run row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={run} disabled={loading} style={{
          padding: "9px 22px", background: G, color: "#fff",
          border: "none", borderRadius: 6, fontWeight: 600,
          opacity: loading ? 0.6 : 1,
        }}>
          {loading ? <><span className="spinner" />Running</> : "Run all tests"}
        </button>

        {data && (
          <span style={{
            fontWeight: 700, fontSize: 15,
            color: data.passed === data.total ? G : "#111",
          }}>
            {data.score} {data.passed === data.total ? "✓" : "✗"}
          </span>
        )}
      </div>

      {error && <p style={{ color: "#111", fontSize: 13, marginBottom: 14 }}>✗ {error}</p>}

      {/* Results table */}
      {data && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e5e5" }}>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 500, width: 24 }}></th>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 500, width: 56 }}>Kind</th>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 500 }}>Input</th>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 500, width: 70 }}>Expect</th>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 500, width: 60 }}>Got</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: r.pass ? "transparent" : "#fafafa" }}>
                <td style={{ padding: "7px 8px", color: r.pass ? G : "#111", fontWeight: 700 }}>
                  {r.pass ? "✓" : "✗"}
                </td>
                <td style={{ padding: "7px 8px", color: "#888" }}>{r.kind}</td>
                <td style={{ padding: "7px 8px" }}>
                  <span dir="auto" style={{ display: "block", wordBreak: "break-all" }}>
                    {r.input || <em style={{ color: "#aaa" }}>empty</em>}
                  </span>
                  <span style={{ color: "#aaa", fontSize: 12 }}>{r.desc}</span>
                </td>
                <td style={{ padding: "7px 8px", color: "#555" }}>{r.expectValid ? "valid" : "invalid"}</td>
                <td style={{ padding: "7px 8px", color: r.pass ? G : "#111", fontWeight: r.pass ? 400 : 600 }}>
                  {r.got ? "valid" : "invalid"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!data && !loading && (
        <p style={{ color: "#aaa", fontSize: 13 }}>Press "Run all tests" to validate 20 cases through the backend.</p>
      )}
    </div>
  );
}
