"use client";

interface StatsRowProps {
  deskMins: number;
  deskBlockCount: number;
  doneCount: number;
  totalBlocks: number;
  completionPct: number;
  mustCount: number;
  prayerCount: number;
}

export function StatsRow({ deskMins, deskBlockCount, doneCount, totalBlocks, completionPct, mustCount, prayerCount }: StatsRowProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
      <div style={{ ...cardStyle, textAlign: "center" }}>
        <div style={labelStyle}>Focus</div>
        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--warn)" }}>{(deskMins / 60).toFixed(1)}h</div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{deskBlockCount} desk blocks</div>
      </div>
      <div style={{ ...cardStyle, textAlign: "center" }}>
        <div style={labelStyle}>Done</div>
        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent)" }}>{totalBlocks > 0 ? `${completionPct}%` : "--"}</div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{doneCount} / {totalBlocks}</div>
      </div>
      <div style={{ ...cardStyle, textAlign: "center" }}>
        <div style={labelStyle}>Blocks</div>
        <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{totalBlocks}</div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{mustCount} must &middot; {prayerCount} prayer</div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 6, padding: 14 };
const labelStyle: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-muted)", marginBottom: 4 };
