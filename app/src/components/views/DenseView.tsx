"use client";
import { useState, useRef, useEffect } from "react";
import { useTimer } from "~/hooks/useTimer";
import { useChatAgent } from "~/hooks/useChatAgent";
import { timeToDate, blockMinutes } from "~/lib/utils";
import { TYPE_COLORS } from "~/lib/constants";
import type { useSchedule } from "~/hooks/useSchedule";

interface DenseViewProps {
  date: string;
  schedule: ReturnType<typeof useSchedule>;
  onShiftDate: (offset: number) => void;
  location: { lat: number | null; lng: number | null };
  onScheduleParsed: (parsed: any) => void;
}

export function DenseView({ date, schedule, onShiftDate, location, onScheduleParsed }: DenseViewProps) {
  const [chatInput, setChatInput] = useState("");
  const { messages, send, loading } = useChatAgent(date, location, onScheduleParsed);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { blocks, active, nextBlock, doneCount, completionPct, deskMins, deskBlockCount, mustCount, prayerCount, typeMins } = schedule;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const activeEndMs = active ? timeToDate(date, active.end).getTime() : null;
  const { label: activeLabel } = useTimer(activeEndMs);
  const activePct = active ? Math.min(100, ((Date.now() - timeToDate(date, active.start).getTime()) / (timeToDate(date, active.end).getTime() - timeToDate(date, active.start).getTime())) * 100) : 0;

  const now = new Date();
  const dayFrac = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const dow = (now.getDay() + 6) % 7;
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((+now - +startOfYear) / 86400000) + 1;
  const totalDays = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0 ? 366 : 365;

  const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
  const typeSorted = Object.entries(typeMins).sort((a, b) => b[1] - a[1]);

  const c: React.CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 6, padding: "14px 16px" };
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 };

  return (
    <div style={{ height: "calc(100vh - 48px)", marginTop: 48, overflow: "auto", padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr 320px", gridTemplateRows: "auto auto auto 1fr", gap: 8 }}>
      {/* NOW — spans 2 */}
      <div style={{ ...c, gridColumn: "1 / 3", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={lbl}>CURRENT BLOCK</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{active?.title ?? "No active block"}</div>
          {active && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{active.start}-{active.end} &middot; {active.location} &middot; {active.priority} &middot; {active.type}</div>}
        </div>
        {active && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 36, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "var(--accent)" }}>{activeLabel}</div>
            <div style={{ height: 3, background: "var(--surface-3)", borderRadius: 2, marginTop: 8, width: 180 }}>
              <div style={{ width: `${activePct}%`, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
            </div>
          </div>
        )}
      </div>

      {/* UP NEXT */}
      <div style={c}>
        <div style={lbl}>UP NEXT</div>
        {nextBlock ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{nextBlock.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{nextBlock.start} - {nextBlock.end}</div>
            <NextTimer start={nextBlock.start} date={date} />
          </>
        ) : <div style={{ color: "var(--text-muted)", fontSize: 13 }}>End of day</div>}
      </div>

      {/* Stats: DAY WEEK YEAR */}
      {[
        { label: "DAY", pct: Math.round(dayFrac * 100), sub: `${Math.round((1 - dayFrac) * 24)}h left` },
        { label: "WEEK", pct: Math.round(((dow + dayFrac) / 7) * 100), sub: `Day ${dow + 1} of 7` },
        { label: "YEAR", pct: Math.round((dayOfYear / totalDays) * 100), sub: `Day ${dayOfYear}` },
      ].map(s => (
        <div key={s.label} style={c}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ ...lbl, margin: 0 }}>{s.label}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{s.pct}%</span>
          </div>
          <div style={{ height: 3, background: "var(--surface-3)", borderRadius: 2, margin: "8px 0 4px" }}>
            <div style={{ width: `${s.pct}%`, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.sub}</div>
        </div>
      ))}

      {/* BLOCK TYPES — spans 2 */}
      <div style={{ ...c, gridColumn: "1 / 3" }}>
        <div style={lbl}>BLOCK TYPES</div>
        <div style={{ display: "flex", height: 20, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
          {typeSorted.map(([type, mins]) => <div key={type} style={{ flex: mins, background: TYPE_COLORS[type] ?? "#888" }} />)}
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {typeSorted.map(([type, mins]) => (
            <span key={type} style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLORS[type] ?? "#888" }} />{type} {(mins / 60).toFixed(1)}h
            </span>
          ))}
        </div>
      </div>

      {/* WEEK + FOCUS + DONE */}
      <div style={{ ...c, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={lbl}>WEEK</div>
          <div style={{ display: "flex", gap: 4, margin: "4px 0" }}>
            {DAYS.map((d, i) => <span key={i} style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, background: i === dow ? "var(--good)" : "var(--surface-3)", color: i === dow ? "white" : "var(--text-muted)" }}>{d}</span>)}
          </div>
        </div>
        <div>
          <div style={lbl}>FOCUS</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--warn)" }}>{(deskMins / 60).toFixed(1)}h</div>
        </div>
        <div>
          <div style={lbl}>DONE</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>{doneCount}/{blocks.length}</div>
        </div>
      </div>

      {/* SCHEDULE — spans 2 */}
      <div style={{ ...c, gridColumn: "1 / 3", overflow: "auto", maxHeight: 360 }}>
        <div style={lbl}>SCHEDULE</div>
        {blocks.map(b => {
          const isCurrent = b.id === active?.id;
          return (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 6, marginBottom: 1, background: isCurrent ? "var(--surface-2)" : "transparent", borderLeft: `3px solid ${TYPE_COLORS[b.type] ?? "#888"}`, cursor: "pointer" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", width: 85, flexShrink: 0, fontFamily: "var(--font-mono)" }}>{b.start}-{b.end}</span>
              <span style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 400, flex: 1 }}>{b.title}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{b.location} &middot; {b.type}</span>
              {b.type === "prayer" && <span style={{ fontSize: 9, color: "var(--accent)" }}>&#9875;</span>}
              <button onClick={() => schedule.toggleBlock(b.id)} style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${b.completed ? "var(--good)" : "var(--border)"}`, background: b.completed ? "var(--good-soft)" : "transparent", flexShrink: 0, cursor: "pointer", display: "grid", placeItems: "center", fontSize: "0.65rem", color: "var(--good)", padding: 0 }}>
                {b.completed ? "✓" : ""}
              </button>
            </div>
          );
        })}
      </div>

      {/* AGENT chat panel */}
      <div style={{ ...c, display: "flex", flexDirection: "column" }}>
        <div style={lbl}>AGENT</div>
        <div style={{ flex: 1, overflow: "auto", fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 8, fontSize: 12, color: msg.role === "user" ? "var(--text)" : "var(--text-muted)", whiteSpace: "pre-wrap" }}>
              <span style={{ fontWeight: 600, color: msg.role === "user" ? "var(--accent)" : "var(--text-muted)" }}>{msg.role === "user" ? "You" : "Agent"}:</span> {msg.content.slice(0, 200)}{msg.content.length > 200 ? "..." : ""}
            </div>
          ))}
          {loading && <div style={{ color: "var(--text-muted)" }}>Thinking...</div>}
          <div ref={chatEndRef} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void send(chatInput); setChatInput(""); } }}
            placeholder="Chat..." disabled={loading}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 12, outline: "none", fontFamily: "var(--font-sans)" }} />
          <button onClick={() => { void send(chatInput); setChatInput(""); }} disabled={loading}
            style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "var(--accent)", color: "white", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>&#8594;</button>
        </div>
      </div>
    </div>
  );
}

function NextTimer({ start, date }: { start: string; date: string }) {
  const ms = timeToDate(date, start).getTime();
  const { label } = useTimer(ms);
  return <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>in {label}</div>;
}
