"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { NowNextCards } from "~/components/shared/NowNextCards";
import { StatsRow } from "~/components/shared/StatsRow";
import { TypeChart } from "~/components/shared/TypeChart";
import { BlockList } from "~/components/shared/BlockList";
import { DateNav } from "~/components/shared/DateNav";
import { RadialClock } from "~/components/visualizations/RadialClock";
import { RibbonPills } from "~/components/visualizations/RibbonPills";
import type { useSchedule } from "~/hooks/useSchedule";

type VizMode = "list" | "clock" | "ribbon";

interface ClassicViewProps {
  date: string;
  schedule: ReturnType<typeof useSchedule>;
  onShiftDate: (offset: number) => void;
}

export function ClassicView({ date, schedule, onShiftDate }: ClassicViewProps) {
  const [vizMode, setVizMode] = useState<VizMode>("list");
  const [clockScale, setClockScale] = useState<"day" | "week" | "month">("day");
  const clock = new Date().toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)", marginTop: 48 }}>
      <Sidebar clock={clock} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)", padding: "14px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                {schedule.schedule?.title || new Date(date + "T12:00:00").toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </h1>
              {schedule.schedule?.note && (
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{schedule.schedule.note}</span>
              )}
            </div>
            <DateNav dateStr={date} onPrev={() => onShiftDate(-1)} onNext={() => onShiftDate(1)} />
          </div>
        </div>

        {/* Dashboard content */}
        <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <NowNextCards active={schedule.active} nextBlock={schedule.nextBlock} date={date} />

          <LifeProgressRow />

          <StatsRow
            deskMins={schedule.deskMins}
            deskBlockCount={schedule.deskBlockCount}
            doneCount={schedule.doneCount}
            totalBlocks={schedule.blocks.length}
            completionPct={schedule.completionPct}
            mustCount={schedule.mustCount}
            prayerCount={schedule.prayerCount}
          />

          <TypeChart typeMins={schedule.typeMins} />

          {/* Visualization toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 2 }}>
              {([["list", "List"], ["clock", "Clock"], ["ribbon", "Ribbon"]] as [VizMode, string][]).map(([mode, label]) => (
                <button key={mode} onClick={() => setVizMode(mode)} style={{
                  padding: "4px 12px", borderRadius: 4, border: "1px solid var(--border)",
                  background: vizMode === mode ? "var(--surface-2)" : "transparent",
                  color: vizMode === mode ? "var(--text)" : "var(--text-muted)",
                  fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)",
                }}>
                  {label}
                </button>
              ))}
            </div>
            {vizMode === "clock" && (
              <div style={{ display: "flex", gap: 2 }}>
                {([["day", "Day"], ["week", "Week"], ["month", "Month"]] as ["day" | "week" | "month", string][]).map(([scale, label]) => (
                  <button key={scale} onClick={() => setClockScale(scale)} style={{
                    padding: "3px 10px", borderRadius: 4, border: "1px solid var(--border)",
                    background: clockScale === scale ? "var(--accent-soft)" : "transparent",
                    color: clockScale === scale ? "var(--accent)" : "var(--text-muted)",
                    fontSize: "0.68rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)",
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active visualization */}
          {vizMode === "list" && (
            <BlockList blocks={schedule.blocks} date={date} activeId={schedule.active?.id} onToggle={schedule.toggleBlock} />
          )}
          {vizMode === "clock" && (
            <RadialClock scale={clockScale} blocks={schedule.blocks} date={date} />
          )}
          {vizMode === "ribbon" && (
            <RibbonPills blocks={schedule.blocks} date={date} />
          )}
        </div>
      </div>
    </div>
  );
}

function LifeProgressRow() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const dayFrac = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((+now - +startOfYear) / 86400000) + 1;
  const totalDays = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0 ? 366 : 365;

  const items = [
    { label: "DAY", pct: Math.round(dayFrac * 100), sub: `${Math.round((1 - dayFrac) * 24)}h remaining` },
    { label: "WEEK", pct: Math.round(((dow + dayFrac) / 7) * 100), sub: `${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][dow]} \u00b7 Day ${dow + 1} of 7` },
    { label: "YEAR", pct: Math.round((dayOfYear / totalDays) * 100), sub: `Day ${dayOfYear} of ${totalDays}` },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {items.map(s => (
        <div key={s.label} style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 6, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-muted)" }}>{s.label}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--accent)" }}>{s.pct}%</span>
          </div>
          <div style={{ height: 3, background: "var(--surface-3)", borderRadius: 2, margin: "8px 0 6px" }}>
            <div style={{ width: `${s.pct}%`, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
