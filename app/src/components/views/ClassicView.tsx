"use client";
/**
 * T3 CONCEPT: This is a "view" component — it composes shared components
 * into a specific layout. It receives all data via props from page.tsx.
 * No hooks called here except useState for local UI state (tabs).
 * This keeps the view testable and reusable.
 */
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { NowNextCards } from "~/components/shared/NowNextCards";
import { StatsRow } from "~/components/shared/StatsRow";
import { TypeChart } from "~/components/shared/TypeChart";
import { BlockList } from "~/components/shared/BlockList";
import { DateNav } from "~/components/shared/DateNav";
import type { useSchedule } from "~/hooks/useSchedule";

interface ClassicViewProps {
  date: string;
  schedule: ReturnType<typeof useSchedule>;
  onShiftDate: (offset: number) => void;
}

export function ClassicView({ date, schedule, onShiftDate }: ClassicViewProps) {
  const [activeTab, setActiveTab] = useState<"today" | "week" | "month">("today");
  const clock = new Date().toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)", marginTop: 48 }}>
      <Sidebar clock={clock} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar with tabs */}
        <div style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px 0" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                {schedule.schedule?.title || new Date(date + "T12:00:00").toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </h1>
              {schedule.schedule?.note && (
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{schedule.schedule.note}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <DateNav dateStr={date} onPrev={() => onShiftDate(-1)} onNext={() => onShiftDate(1)} />
              <button style={{
                padding: "6px 14px", borderRadius: 6, border: "none",
                background: "var(--accent)", color: "white", fontSize: 13,
                fontWeight: 600, cursor: "pointer",
              }}>Save</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 0, padding: "0 24px", marginTop: 12 }}>
            {(["today", "week", "month"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  padding: "8px 16px", border: "none", background: "none",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                  color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
                  borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
                  textTransform: "capitalize", fontFamily: "var(--font-sans)",
                }}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard content */}
        <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <NowNextCards active={schedule.active} nextBlock={schedule.nextBlock} date={date} />

          {/* Day/Week/Year progress row */}
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

          <BlockList
            blocks={schedule.blocks}
            date={date}
            activeId={schedule.active?.id}
            onToggle={schedule.toggleBlock}
          />
        </div>
      </div>
    </div>
  );
}

/** Inline life progress row for Classic view */
function LifeProgressRow() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const dayFrac = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((+now - +startOfYear) / 86400000) + 1;
  const totalDays = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0 ? 366 : 365;

  const items = [
    { label: "DAY", pct: Math.round(dayFrac * 100), sub: `${Math.round((1 - dayFrac) * 24)}h remaining` },
    { label: "WEEK", pct: Math.round(((dow + dayFrac) / 7) * 100), sub: `${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][dow]} · Day ${dow + 1} of 7` },
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
