"use client";
import { useState } from "react";
import { useTimer } from "~/hooks/useTimer";
import { timeToDate, durationLabel, blockMinutes } from "~/lib/utils";
import { TYPE_COLORS } from "~/lib/constants";
import { BlockList } from "~/components/shared/BlockList";
import type { useSchedule } from "~/hooks/useSchedule";

interface TimelineViewProps {
  date: string;
  schedule: ReturnType<typeof useSchedule>;
  onShiftDate: (offset: number) => void;
}

export function TimelineView({ date, schedule }: TimelineViewProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const { blocks, active, nextBlock, doneCount, completionPct } = schedule;

  // Gantt: 4am to 10pm = 18 hours
  const ganttStart = 4;
  const ganttHours = 18;
  const totalMins = ganttHours * 60;

  function timeToPercent(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    const mins = (h! - ganttStart) * 60 + m!;
    return Math.max(0, Math.min(100, (mins / totalMins) * 100));
  }

  // Now position
  const now = new Date();
  const nowMins = (now.getHours() - ganttStart) * 60 + now.getMinutes();
  const nowPct = Math.max(0, Math.min(100, (nowMins / totalMins) * 100));

  // Life stats
  const dayFrac = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const dow = (now.getDay() + 6) % 7;
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((+now - +startOfYear) / 86400000) + 1;
  const totalDays = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0 ? 366 : 365;

  const selectedBlock = selectedIdx !== null ? blocks[selectedIdx] : null;

  // Active timer
  const activeEndMs = active ? timeToDate(date, active.end).getTime() : null;
  const { label: activeLabel } = useTimer(activeEndMs);

  return (
    <div style={{ height: "calc(100vh - 48px)", marginTop: 48, fontFamily: "var(--font-mono)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Active block bar */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 40, alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", marginBottom: 4 }}>ACTIVE</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{active?.title ?? "No active block"}</div>
          </div>
          {active && <div style={{ fontSize: 42, fontWeight: 800, color: "var(--accent)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>{activeLabel}</div>}
          {nextBlock && (
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 4 }}>NEXT</div>
              <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{nextBlock.title}</div>
            </div>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 12 }}>
            <span style={{ color: "var(--accent)" }}>{Math.round(dayFrac * 100)}% DAY</span>
            <span style={{ color: "var(--text-muted)" }}>|</span>
            <span style={{ color: "var(--good)" }}>{Math.round(((dow + dayFrac) / 7) * 100)}% WEEK</span>
            <span style={{ color: "var(--text-muted)" }}>|</span>
            <span style={{ color: "var(--text-muted)" }}>{Math.round((dayOfYear / totalDays) * 100)}% YEAR</span>
          </div>
        </div>
      </div>

      {/* Horizontal Gantt */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ position: "relative", height: 56 }}>
          {/* Hour markers */}
          {Array.from({ length: ganttHours + 1 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: `${(i / ganttHours) * 100}%`, top: 0, height: "100%", borderLeft: "1px solid var(--border)" }}>
              <span style={{ position: "absolute", top: -16, left: 2, fontSize: 9, color: "var(--text-muted)" }}>{String(i + ganttStart).padStart(2, "0")}</span>
            </div>
          ))}
          {/* Blocks */}
          {blocks.map((b, i) => {
            const left = timeToPercent(b.start);
            const right = timeToPercent(b.end);
            const width = Math.max(right - left, 0.5);
            const color = TYPE_COLORS[b.type] ?? "#888";
            return (
              <div key={b.id} onClick={() => setSelectedIdx(i)}
                style={{
                  position: "absolute", left: `${left}%`, width: `${width}%`,
                  top: 18, height: 32,
                  background: selectedIdx === i ? color : `${color}66`,
                  borderRadius: 3, cursor: "pointer", transition: "all 0.15s",
                  border: selectedIdx === i ? `1px solid ${color}` : "1px solid transparent",
                }} />
            );
          })}
          {/* Now line */}
          <div style={{ position: "absolute", left: `${nowPct}%`, top: 14, height: 40, width: 2, background: "var(--accent)", zIndex: 2 }}>
            <div style={{ position: "absolute", top: -6, left: -3, width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
          </div>
        </div>
      </div>

      {/* Block list + detail panel */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "auto", padding: "12px 24px" }}>
          {blocks.map((b, i) => {
            const color = TYPE_COLORS[b.type] ?? "#888";
            return (
              <div key={b.id} onClick={() => setSelectedIdx(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "8px 12px", borderRadius: 6, cursor: "pointer",
                  background: selectedIdx === i ? "var(--surface-2)" : "transparent",
                  borderLeft: `3px solid ${selectedIdx === i ? color : "transparent"}`,
                  marginBottom: 1, transition: "all 0.1s",
                }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", width: 90, flexShrink: 0 }}>{b.start}-{b.end}</span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: selectedIdx === i ? 600 : 400, flex: 1 }}>{b.title}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{b.type}</span>
                {b.type === "prayer" && <span style={{ fontSize: 9, color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 3, padding: "1px 5px", opacity: 0.6 }}>ANCHOR</span>}
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div style={{ width: 280, borderLeft: "1px solid var(--border)", padding: 20, flexShrink: 0 }}>
          {selectedBlock ? (
            <>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_COLORS[selectedBlock.type] ?? "#888", marginBottom: 12 }} />
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selectedBlock.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{selectedBlock.note}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{selectedBlock.start} - {selectedBlock.end}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{blockMinutes(selectedBlock.start, selectedBlock.end)} minutes</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[selectedBlock.location, selectedBlock.priority, selectedBlock.type].map(t => (
                  <span key={t} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--border)", fontSize: 11, color: "var(--text-muted)" }}>{t}</span>
                ))}
              </div>
              {selectedBlock.type === "prayer" && <div style={{ marginTop: 12, fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>ANCHOR BLOCK</div>}
            </>
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Click a block to see details</div>
          )}
        </div>
      </div>
    </div>
  );
}
