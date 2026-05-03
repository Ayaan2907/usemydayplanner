"use client";
import { useState } from "react";
import { useTimer } from "~/hooks/useTimer";
import { timeToDate, durationLabel } from "~/lib/utils";
import { BlockList } from "~/components/shared/BlockList";
import type { useSchedule } from "~/hooks/useSchedule";

import type { ViewId } from "~/hooks/useViewPreference";

interface ZenViewProps {
  date: string;
  schedule: ReturnType<typeof useSchedule>;
  onShiftDate: (offset: number) => void;
  onChangeView?: (view: ViewId) => void;
}

export function ZenView({ date, schedule, onChangeView }: ZenViewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { active, nextBlock, blocks, doneCount, completionPct } = schedule;

  const activeEndMs = active ? timeToDate(date, active.end).getTime() : null;
  const activeStartMs = active ? timeToDate(date, active.start).getTime() : null;
  const { label: timerLabel } = useTimer(activeEndMs);
  const pct = activeStartMs && activeEndMs ? Math.min(100, ((Date.now() - activeStartMs) / (activeEndMs - activeStartMs)) * 100) : 0;

  const nextStartMs = nextBlock ? timeToDate(date, nextBlock.start).getTime() : null;
  const { label: nextLabel } = useTimer(nextStartMs);

  // Life stats
  const now = new Date();
  const dayFrac = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const dow = (now.getDay() + 6) % 7;
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((+now - +startOfYear) / 86400000) + 1;
  const totalDays = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0 ? 366 : 365;

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {/* Minimal top bar with exit */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => onChangeView?.("classic")} style={{
            background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)",
            borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600,
            fontFamily: "var(--font-sans)", transition: "color 120ms ease",
          }} title="Exit Zen mode">
            &#8592; Exit
          </button>
          <span style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.1em" }}>ZEN</span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {new Date(date + "T12:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>

      {/* Central focus */}
      {active ? (
        <div style={{ textAlign: "center", maxWidth: 600 }}>
          <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, letterSpacing: "0.15em", marginBottom: 16 }}>NOW</div>
          <div style={{ fontSize: 56, fontWeight: 300, lineHeight: 1.1, marginBottom: 8, letterSpacing: "-0.03em" }}>{active.title}</div>
          <div style={{ fontSize: 18, color: "var(--text-muted)", marginBottom: 32 }}>{active.note}</div>
          <div style={{ fontSize: 72, fontWeight: 200, fontVariantNumeric: "tabular-nums", color: "var(--accent)", letterSpacing: "-0.04em" }}>{timerLabel}</div>
          <div style={{ width: 200, height: 2, background: "var(--surface-3)", margin: "24px auto", borderRadius: 1 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 1, transition: "width 1s ease" }} />
          </div>
          {nextBlock && (
            <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 24 }}>
              Next: <span style={{ color: "var(--text)" }}>{nextBlock.title}</span>{" "}
              <span style={{ color: "var(--accent)" }}>in {nextLabel}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 32, fontWeight: 300, marginBottom: 8 }}>No active block</div>
          {nextBlock && (
            <div style={{ fontSize: 16 }}>
              Next: <span style={{ color: "var(--text)" }}>{nextBlock.title}</span>{" "}
              <span style={{ color: "var(--accent)" }}>at {nextBlock.start}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats bottom-left */}
      <div style={{ position: "absolute", left: 32, bottom: 80, fontSize: 11, color: "var(--text-muted)" }}>
        <div style={{ marginBottom: 4 }}>DAY <span style={{ color: "var(--accent)", fontWeight: 700 }}>{Math.round(dayFrac * 100)}%</span></div>
        <div style={{ marginBottom: 4 }}>WEEK <span style={{ color: "var(--accent)", fontWeight: 700 }}>{Math.round(((dow + dayFrac) / 7) * 100)}%</span></div>
        <div>YEAR <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>{Math.round((dayOfYear / totalDays) * 100)}%</span></div>
      </div>

      {/* Pull-up drawer */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
        <div onClick={() => setDrawerOpen(!drawerOpen)} style={{ textAlign: "center", padding: 12, cursor: "pointer" }}>
          <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 8px" }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {drawerOpen ? "Hide schedule" : `${blocks.length} blocks \u00b7 ${completionPct}% complete`}
          </span>
        </div>
        {drawerOpen && (
          <div style={{ maxHeight: 300, overflow: "auto", padding: "0 32px 20px" }}>
            <BlockList blocks={blocks} date={date} activeId={active?.id} onToggle={schedule.toggleBlock} />
          </div>
        )}
      </div>
    </div>
  );
}
