"use client";
import { useState } from "react";
import { TYPE_COLORS } from "~/lib/constants";
import { blockMinutes } from "~/lib/utils";

// === Shared SVG math ===
const CX = 200, CY = 200, OUTER_R = 160, INNER_R = 100;

function angleToXY(angle: number, r: number) {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function arcPath(startAngle: number, endAngle: number, outerR: number, innerR: number): string {
  const s1 = angleToXY(startAngle, outerR);
  const s2 = angleToXY(endAngle, outerR);
  const s3 = angleToXY(endAngle, innerR);
  const s4 = angleToXY(startAngle, innerR);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${s1.x} ${s1.y} A ${outerR} ${outerR} 0 ${large} 1 ${s2.x} ${s2.y} L ${s3.x} ${s3.y} A ${innerR} ${innerR} 0 ${large} 0 ${s4.x} ${s4.y} Z`;
}

// === Types ===
interface Block { id: string; start: string; end: string; title: string; type: string; completed: boolean }
interface DaySchedule { date: string; title: string; blocks: Block[]; doneCount: number; totalBlocks: number }

type ClockScale = "day" | "week" | "month";

interface RadialClockProps {
  scale: ClockScale;
  // Day scale
  blocks?: Block[];
  date?: string;
  // Week/Month scale
  schedules?: DaySchedule[];
  onSelectDate?: (date: string) => void;
}

export function RadialClock({ scale, blocks, date, schedules, onSelectDate }: RadialClockProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (scale === "day") return <DayClock blocks={blocks ?? []} date={date ?? ""} hovered={hovered} setHovered={setHovered} />;
  if (scale === "week") return <WeekClock schedules={schedules ?? []} hovered={hovered} setHovered={setHovered} onSelectDate={onSelectDate} />;
  return <MonthClock schedules={schedules ?? []} hovered={hovered} setHovered={setHovered} onSelectDate={onSelectDate} />;
}

// === DAY CLOCK ===
function DayClock({ blocks, date, hovered, setHovered }: { blocks: Block[]; date: string; hovered: number | null; setHovered: (i: number | null) => void }) {
  function hourToAngle(h: number) {
    return ((h / 24) * 360 - 90) * (Math.PI / 180);
  }

  function timeToHour(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    return h! + m! / 60;
  }

  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const nowAngle = hourToAngle(nowH);
  const nowPos = angleToXY(nowAngle, OUTER_R + 4);

  const hoveredBlock = hovered !== null ? blocks[hovered] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg width={420} height={420} viewBox="-10 -10 420 420">
        {/* Hour markers */}
        {Array.from({ length: 8 }, (_, i) => i * 3).map(h => {
          const angle = hourToAngle(h);
          const p1 = angleToXY(angle, OUTER_R + 4);
          const p2 = angleToXY(angle, OUTER_R + 12);
          const pt = angleToXY(angle, OUTER_R + 24);
          return (
            <g key={h}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--border)" strokeWidth={1} />
              <text x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="var(--text-muted)" style={{ fontFamily: "var(--font-sans)" }}>
                {String(h).padStart(2, "0")}
              </text>
            </g>
          );
        })}

        {/* Block arcs */}
        {blocks.map((b, i) => {
          const startA = hourToAngle(timeToHour(b.start));
          const endA = hourToAngle(timeToHour(b.end));
          const color = TYPE_COLORS[b.type] ?? "#888";
          return (
            <path key={b.id} d={arcPath(startA, endA, hovered === i ? OUTER_R + 6 : OUTER_R, INNER_R)}
              fill={hovered === i ? color : `${color}88`}
              style={{ cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
          );
        })}

        {/* Center info */}
        <circle cx={CX} cy={CY} r={INNER_R - 8} fill="var(--bg)" />
        {hoveredBlock ? (
          <>
            <text x={CX} y={CY - 16} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--text)" style={{ fontFamily: "var(--font-sans)" }}>{hoveredBlock.title}</text>
            <text x={CX} y={CY + 4} textAnchor="middle" fontSize={11} fill="var(--text-muted)" style={{ fontFamily: "var(--font-mono)" }}>{hoveredBlock.start}-{hoveredBlock.end}</text>
            <text x={CX} y={CY + 22} textAnchor="middle" fontSize={11} fontWeight={600} fill={TYPE_COLORS[hoveredBlock.type] ?? "#888"} style={{ fontFamily: "var(--font-sans)" }}>{hoveredBlock.type}</text>
          </>
        ) : (
          <>
            <text x={CX} y={CY - 10} textAnchor="middle" fontSize={11} fill="var(--text-muted)" letterSpacing="0.08em" style={{ fontFamily: "var(--font-sans)" }}>
              {date ? new Date(date + "T12:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : ""}
            </text>
            <text x={CX} y={CY + 14} textAnchor="middle" fontSize={22} fontWeight={800} fill="var(--text)" style={{ fontFamily: "var(--font-sans)" }}>{blocks.length} blocks</text>
          </>
        )}

        {/* Now dot */}
        <circle cx={nowPos.x} cy={nowPos.y} r={5} fill="var(--accent)" />
      </svg>
    </div>
  );
}

// === WEEK CLOCK ===
function WeekClock({ schedules, hovered, setHovered, onSelectDate }: { schedules: DaySchedule[]; hovered: number | null; setHovered: (i: number | null) => void; onSelectDate?: (date: string) => void }) {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const segmentAngle = (2 * Math.PI) / 7;
  const todayStr = new Date().toISOString().split("T")[0];

  // Build 7 segments, each with type breakdown
  const segments = DAYS.map((day, i) => {
    const sched = schedules.find(s => {
      const d = new Date(s.date + "T12:00:00");
      return (d.getDay() + 6) % 7 === i;
    });
    return { day, date: sched?.date, blocks: sched?.blocks ?? [], doneCount: sched?.doneCount ?? 0, totalBlocks: sched?.totalBlocks ?? 0, title: sched?.title ?? "" };
  });

  const hoveredSeg = hovered !== null ? segments[hovered] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg width={420} height={420} viewBox="-10 -10 420 420">
        {segments.map((seg, i) => {
          const startA = i * segmentAngle - Math.PI / 2;
          const endA = (i + 1) * segmentAngle - Math.PI / 2;
          const hasBlocks = seg.blocks.length > 0;
          const isToday = seg.date === todayStr;
          const pct = seg.totalBlocks > 0 ? seg.doneCount / seg.totalBlocks : 0;

          let color = "var(--surface-3)";
          if (hasBlocks) {
            if (pct >= 0.8) color = "var(--good)";
            else if (pct >= 0.4) color = "var(--warn)";
            else color = "var(--accent)";
          }

          return (
            <g key={i}>
              <path
                d={arcPath(startA, endA - 0.02, hovered === i ? OUTER_R + 4 : OUTER_R, INNER_R)}
                fill={hovered === i ? `${hasBlocks ? color : "var(--surface-2)"}` : `${hasBlocks ? color : "var(--surface-3)"}55`}
                stroke={isToday ? "var(--accent)" : "transparent"} strokeWidth={isToday ? 2 : 0}
                style={{ cursor: hasBlocks ? "pointer" : "default", transition: "all 0.2s" }}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                onClick={() => seg.date && onSelectDate?.(seg.date)}
              />
              {/* Day label */}
              {(() => {
                const midA = (startA + endA) / 2;
                const labelPos = angleToXY(midA, OUTER_R + 18);
                return <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={600} fill={isToday ? "var(--accent)" : "var(--text-muted)"} style={{ fontFamily: "var(--font-sans)" }}>{seg.day}</text>;
              })()}
            </g>
          );
        })}

        {/* Center */}
        <circle cx={CX} cy={CY} r={INNER_R - 8} fill="var(--bg)" />
        {hoveredSeg ? (
          <>
            <text x={CX} y={CY - 16} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--text)" style={{ fontFamily: "var(--font-sans)" }}>{hoveredSeg.day}</text>
            <text x={CX} y={CY + 4} textAnchor="middle" fontSize={11} fill="var(--text-muted)" style={{ fontFamily: "var(--font-sans)" }}>{hoveredSeg.blocks.length} blocks</text>
            <text x={CX} y={CY + 22} textAnchor="middle" fontSize={11} fill="var(--text-muted)" style={{ fontFamily: "var(--font-sans)" }}>
              {hoveredSeg.totalBlocks > 0 ? `${Math.round((hoveredSeg.doneCount / hoveredSeg.totalBlocks) * 100)}% done` : "no schedule"}
            </text>
          </>
        ) : (
          <>
            <text x={CX} y={CY - 10} textAnchor="middle" fontSize={11} fill="var(--text-muted)" letterSpacing="0.08em" style={{ fontFamily: "var(--font-sans)" }}>THIS WEEK</text>
            <text x={CX} y={CY + 14} textAnchor="middle" fontSize={20} fontWeight={800} fill="var(--text)" style={{ fontFamily: "var(--font-sans)" }}>{schedules.length}/7</text>
            <text x={CX} y={CY + 32} textAnchor="middle" fontSize={11} fill="var(--text-muted)" style={{ fontFamily: "var(--font-sans)" }}>planned</text>
          </>
        )}
      </svg>
    </div>
  );
}

// === MONTH CLOCK ===
function MonthClock({ schedules, hovered, setHovered, onSelectDate }: { schedules: DaySchedule[]; hovered: number | null; setHovered: (i: number | null) => void; onSelectDate?: (date: string) => void }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = now.getDate();
  const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(todayDate).padStart(2, "0")}`;

  const segmentAngle = (2 * Math.PI) / daysInMonth;

  const segments = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const sched = schedules.find(s => s.date === dateStr);
    return { dayNum, date: dateStr, blocks: sched?.blocks ?? [], doneCount: sched?.doneCount ?? 0, totalBlocks: sched?.totalBlocks ?? 0 };
  });

  const hoveredSeg = hovered !== null ? segments[hovered] : null;
  const monthName = now.toLocaleString("default", { month: "long" });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg width={420} height={420} viewBox="-10 -10 420 420">
        {segments.map((seg, i) => {
          const startA = i * segmentAngle - Math.PI / 2;
          const endA = (i + 1) * segmentAngle - Math.PI / 2 - 0.01;
          const hasBlocks = seg.blocks.length > 0;
          const isToday = seg.date === todayStr;
          const pct = seg.totalBlocks > 0 ? seg.doneCount / seg.totalBlocks : 0;

          let fillColor = "var(--surface-3)";
          if (hasBlocks) {
            if (pct >= 0.8) fillColor = "var(--good)";
            else if (pct >= 0.4) fillColor = "var(--warn)";
            else fillColor = "var(--danger)";
          }

          return (
            <path key={i}
              d={arcPath(startA, endA, hovered === i ? OUTER_R + 4 : OUTER_R, INNER_R)}
              fill={hovered === i ? fillColor : `${hasBlocks ? fillColor : "var(--surface-3)"}44`}
              stroke={isToday ? "var(--accent)" : "transparent"} strokeWidth={isToday ? 2 : 0}
              style={{ cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectDate?.(seg.date)}
            />
          );
        })}

        {/* Day numbers at 1st, 8th, 15th, 22nd */}
        {[1, 8, 15, 22].map(d => {
          const idx = d - 1;
          const midA = (idx + 0.5) * segmentAngle - Math.PI / 2;
          const pos = angleToXY(midA, OUTER_R + 18);
          return <text key={d} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="var(--text-muted)" style={{ fontFamily: "var(--font-sans)" }}>{d}</text>;
        })}

        {/* Center */}
        <circle cx={CX} cy={CY} r={INNER_R - 8} fill="var(--bg)" />
        {hoveredSeg ? (
          <>
            <text x={CX} y={CY - 16} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--text)" style={{ fontFamily: "var(--font-sans)" }}>{monthName} {hoveredSeg.dayNum}</text>
            <text x={CX} y={CY + 4} textAnchor="middle" fontSize={11} fill="var(--text-muted)" style={{ fontFamily: "var(--font-sans)" }}>{hoveredSeg.blocks.length} blocks</text>
            <text x={CX} y={CY + 22} textAnchor="middle" fontSize={11} fill="var(--text-muted)" style={{ fontFamily: "var(--font-sans)" }}>
              {hoveredSeg.totalBlocks > 0 ? `${Math.round((hoveredSeg.doneCount / hoveredSeg.totalBlocks) * 100)}% done` : "empty"}
            </text>
          </>
        ) : (
          <>
            <text x={CX} y={CY - 10} textAnchor="middle" fontSize={11} fill="var(--text-muted)" letterSpacing="0.08em" style={{ fontFamily: "var(--font-sans)" }}>{monthName.toUpperCase()}</text>
            <text x={CX} y={CY + 14} textAnchor="middle" fontSize={20} fontWeight={800} fill="var(--text)" style={{ fontFamily: "var(--font-sans)" }}>{schedules.length}/{daysInMonth}</text>
            <text x={CX} y={CY + 32} textAnchor="middle" fontSize={11} fill="var(--text-muted)" style={{ fontFamily: "var(--font-sans)" }}>days planned</text>
          </>
        )}
      </svg>
    </div>
  );
}
