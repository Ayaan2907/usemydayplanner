"use client";
import { TYPE_COLORS } from "~/lib/constants";

interface TypeChartProps {
  typeMins: Record<string, number>;
}

export function TypeChart({ typeMins }: TypeChartProps) {
  const totalMins = Object.values(typeMins).reduce((a, b) => a + b, 0);
  if (totalMins === 0) return null;

  const sorted = Object.entries(typeMins).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ ...cardStyle }}>
      <div style={labelStyle}>Block types</div>
      <div style={{ display: "flex", gap: 2, height: 24, borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
        {sorted.map(([type, mins]) => (
          <div key={type} style={{ flex: mins, background: TYPE_COLORS[type] ?? "#888", minWidth: 3 }} title={`${type}: ${(mins / 60).toFixed(1)}h`} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {sorted.map(([type, mins]) => (
          <span key={type} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.66rem", color: "var(--text-muted)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: TYPE_COLORS[type] ?? "#888", display: "inline-block" }} />
            {type} {(mins / 60).toFixed(1)}h
          </span>
        ))}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 6, padding: 14 };
const labelStyle: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-muted)", marginBottom: 4 };
