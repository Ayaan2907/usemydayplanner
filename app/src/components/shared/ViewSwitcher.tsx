"use client";
import type { ViewId } from "~/hooks/useViewPreference";

const VIEWS: { id: ViewId; icon: string; label: string }[] = [
  { id: "classic", icon: "◫", label: "Classic" },
  { id: "timeline", icon: "⏤", label: "Timeline" },
  { id: "chat", icon: "💬", label: "Chat" },
  { id: "zen", icon: "◉", label: "Zen" },
  { id: "dense", icon: "▣", label: "Dense" },
];

interface ViewSwitcherProps {
  active: ViewId;
  onChange: (view: ViewId) => void;
}

export function ViewSwitcher({ active, onChange }: ViewSwitcherProps) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {VIEWS.map(v => (
        <button key={v.id} onClick={() => onChange(v.id)} style={{
          padding: "4px 10px", borderRadius: 4, border: "1px solid var(--border)",
          background: active === v.id ? "var(--surface-2)" : "transparent",
          color: active === v.id ? "var(--text)" : "var(--text-muted)",
          fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
          fontFamily: "var(--font-sans)", transition: "all 120ms ease",
        }}>
          {v.icon} {v.label}
        </button>
      ))}
    </div>
  );
}
