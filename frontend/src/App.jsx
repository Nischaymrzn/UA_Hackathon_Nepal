import React, { useState, useEffect } from "react";
import { checkHealth } from "./api.js";
import EmailTab     from "./components/EmailTab.jsx";
import DomainTab    from "./components/DomainTab.jsx";
import TestSuiteTab from "./components/TestSuiteTab.jsx";

const TABS = [
  { id: "email",  label: "Email" },
  { id: "domain", label: "Domain" },
  { id: "tests",  label: "Tests" },
];

const G = "#16a34a";

export default function App() {
  const [tab, setTab]           = useState("email");
  const [online, setOnline]     = useState(null);

  useEffect(() => {
    checkHealth().then(() => setOnline(true)).catch(() => setOnline(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 32px",
        borderBottom: "1px solid #e5e5e5",
      }}>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>UA Hackathon Nepal</span>
      </header>

      {/* Tab row */}
      <nav style={{ display: "flex", gap: 0, padding: "0 32px", borderBottom: "1px solid #e5e5e5" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none",
            border: "none",
            borderBottom: t.id === tab ? `2px solid ${G}` : "2px solid transparent",
            marginBottom: -1,
            padding: "10px 18px",
            color: t.id === tab ? G : "#555",
            fontWeight: t.id === tab ? 600 : 400,
            fontSize: 14,
          }}>
            {t.label}
          </button>
        ))}
      </nav>

      <main style={{ flex: 1, maxWidth: 720, width: "100%", margin: "0 auto", padding: "36px 24px" }}>
        {tab === "email"  && <EmailTab />}
        {tab === "domain" && <DomainTab />}
        {tab === "tests"  && <TestSuiteTab />}
      </main>
    </div>
  );
}
