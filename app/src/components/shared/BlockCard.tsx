"use client";
import { timeToDate } from "~/lib/utils";

interface BlockCardProps {
  block: { id: string; blockId: string; start: string; end: string; title: string; note: string; location: string; priority: string; type: string; completed: boolean };
  date: string;
  isCurrent: boolean;
  isMissed: boolean;
  onToggle: () => void;
}

export function BlockCard({ block: b, date, isCurrent, isMissed, onToggle }: BlockCardProps) {
  const isPrayer = b.type === "prayer";

  let bg = "transparent";
  let border = "1px solid transparent";
  if (isCurrent) { bg = "var(--good-soft)"; border = "1px solid var(--good)"; }
  else if (isMissed) { bg = "var(--danger-soft)"; border = "1px solid var(--danger)"; }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "80px 1fr 28px",
      gap: 8, alignItems: "center", padding: "8px 10px",
      borderRadius: 4, background: bg, border,
      borderLeft: isPrayer ? "3px solid var(--good)" : undefined,
      opacity: b.completed ? 0.45 : 1,
      transition: "background 120ms ease",
    }}>
      <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
        {b.start} - {b.end}
        {isPrayer && <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", color: "var(--good)", marginTop: 2, letterSpacing: "0.8px" }}>anchor</div>}
      </div>
      <div>
        <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{b.title}</div>
        {b.note && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{b.note}</div>}
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.3px" }}>
          {b.location} &middot; {b.priority} &middot; {b.type}
        </div>
      </div>
      <button onClick={onToggle} style={{
        width: 26, height: 26, borderRadius: "50%",
        border: `1px solid ${b.completed ? "var(--good)" : "var(--border)"}`,
        background: b.completed ? "var(--good-soft)" : "transparent",
        color: b.completed ? "var(--good)" : "var(--text)",
        cursor: "pointer", display: "grid", placeItems: "center",
        fontSize: "0.75rem", padding: 0,
      }}>
        {b.completed ? "\u2713" : ""}
      </button>
    </div>
  );
}
