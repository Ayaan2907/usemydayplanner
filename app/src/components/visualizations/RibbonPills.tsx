"use client";
import { useState } from "react";
import { TYPE_COLORS } from "~/lib/constants";
import { blockMinutes } from "~/lib/utils";

interface Block { id: string; blockId: string; start: string; end: string; title: string; note: string; location: string; priority: string; type: string; completed: boolean }

interface RibbonPillsProps {
  blocks: Block[];
  date: string;
}

export function RibbonPills({ blocks, date }: RibbonPillsProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const selected = selectedIdx !== null ? blocks[selectedIdx] : null;

  if (blocks.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Ribbon */}
      <div style={{ display: "flex", height: 36, borderRadius: 6, overflow: "hidden", cursor: "pointer" }}>
        {blocks.map((b, i) => {
          const dur = blockMinutes(b.start, b.end);
          const color = TYPE_COLORS[b.type] ?? "#888";
          return (
            <div key={b.id} onClick={() => setSelectedIdx(i)}
              style={{
                flex: dur,
                background: selectedIdx === i ? color : `${color}88`,
                transition: "all 0.2s",
                borderRight: "1px solid rgba(255,255,255,0.15)",
                position: "relative",
              }}>
              {selectedIdx === i && (
                <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${color}` }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Selected block detail card */}
      {selected && (() => {
        const color = TYPE_COLORS[selected.type] ?? "#888";
        const dur = blockMinutes(selected.start, selected.end);
        return (
          <div style={{
            background: "var(--surface-1)", border: "1px solid var(--border)",
            borderRadius: 8, padding: 20, borderTop: `4px solid ${color}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{selected.start} - {selected.end} &middot; {dur} minutes</div>
                {selected.note && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{selected.note}</div>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ padding: "4px 12px", borderRadius: 16, background: `${color}22`, color, fontSize: 12, fontWeight: 600 }}>{selected.type}</span>
                {selected.type === "prayer" && <span style={{ padding: "4px 12px", borderRadius: 16, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>anchor</span>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {blocks.map((b, i) => {
          const color = TYPE_COLORS[b.type] ?? "#888";
          const isSelected = selectedIdx === i;
          return (
            <button key={b.id} onClick={() => setSelectedIdx(i)}
              style={{
                padding: "6px 14px", borderRadius: 20,
                background: isSelected ? color : `${color}15`,
                color: isSelected ? "white" : color,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s",
                border: `1px solid ${isSelected ? color : `${color}33`}`,
              }}>
              {b.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
