"use client";
import { useState } from "react";

const NAV_ITEMS = [
  { id: "planner", icon: "◫", label: "Planner" },
  { id: "history", icon: "↻", label: "History" },
  { id: "insights", icon: "◔", label: "Insights" },
  { id: "templates", icon: "❐", label: "Templates" },
  { id: "settings", icon: "⚙", label: "Settings" },
];

export function Sidebar({ clock }: { clock: string }) {
  const [activeNav, setActiveNav] = useState("planner");

  return (
    <div style={{
      width: 220, borderRight: "1px solid var(--border)", background: "var(--bg)",
      display: "flex", flexDirection: "column", flexShrink: 0, height: "100%",
    }}>
      <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>Day Planner</div>
      </div>
      <nav style={{ padding: 8, flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <div key={item.id} onClick={() => setActiveNav(item.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
              borderRadius: 6, cursor: "pointer", fontSize: 14,
              fontWeight: activeNav === item.id ? 600 : 400,
              background: activeNav === item.id ? "var(--surface-2)" : "transparent",
              color: activeNav === item.id ? "var(--text)" : "var(--text-muted)",
              marginBottom: 2, transition: "all 0.15s",
            }}>
            <span style={{ fontSize: 16, opacity: 0.7 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
        {clock}
      </div>
    </div>
  );
}
