"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { todayStr, formatDateShort, durationLabel, timeToDate, blockMinutes } from "~/lib/utils";
import { TYPE_COLORS } from "~/lib/constants";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [theme, setTheme] = useState("dark");

  const { data: schedule, refetch } = api.schedule.getByDate.useQuery({ date: selectedDate });
  const toggleMutation = api.schedule.toggleBlock.useMutation({ onSuccess: () => void refetch() });
  const metaMutation = api.schedule.updateMeta.useMutation();

  const blocks = schedule?.blocks ?? [];
  const now = new Date();
  const active = blocks.find(b => {
    const s = timeToDate(selectedDate, b.start);
    const e = timeToDate(selectedDate, b.end);
    return now >= s && now < e;
  });
  const nextBlock = blocks.find(b => now < timeToDate(selectedDate, b.start));
  const doneCount = blocks.filter(b => b.completed).length;
  const deskMins = blocks.filter(b => b.location === "desk").reduce((sum, b) => sum + blockMinutes(b.start, b.end), 0);

  useEffect(() => {
    const saved = localStorage.getItem("day-planner-theme") ?? "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("day-planner-theme", next);
  }

  function shiftDate(offset: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  // Type chart data
  const typeMins: Record<string, number> = {};
  blocks.forEach(b => { typeMins[b.type] = (typeMins[b.type] ?? 0) + blockMinutes(b.start, b.end); });
  const totalTypeMins = Object.values(typeMins).reduce((a, b) => a + b, 0);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "60px 16px 40px" }}>
      {/* Header */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 48,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 16px", background: "var(--bg)", borderBottom: "1px solid var(--border)", zIndex: 40,
      }}>
        <h1 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Day Planner</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={toggleTheme} style={btnStyle}>
            {theme === "dark" ? "\u2600" : "\u263D"}
          </button>
          <Clock />
        </div>
      </header>

      {/* Day Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <input
          key={`title-${selectedDate}`}
          defaultValue={schedule?.title ?? ""}
          placeholder="Name this day..."
          onBlur={(e) => metaMutation.mutate({ date: selectedDate, title: e.target.value })}
          style={{ flex: 1, fontSize: "1.2rem", fontWeight: 700, color: "var(--text)", background: "transparent", border: "none", borderBottom: "2px solid transparent", padding: "2px 0", outline: "none" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button onClick={() => shiftDate(-1)} style={navBtnStyle}>&larr;</button>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, minWidth: 120, textAlign: "center" }}>{formatDateShort(selectedDate)}</span>
          <button onClick={() => shiftDate(1)} style={navBtnStyle}>&rarr;</button>
        </div>
      </div>

      {/* NOW + NEXT */}
      {(active ?? nextBlock) && (
        <div style={{ display: "grid", gridTemplateColumns: active && nextBlock ? "1.6fr 1fr" : "1fr", gap: 8, marginBottom: 12 }}>
          {active && (
            <div style={{ ...cardStyle, borderLeft: "3px solid var(--good)", background: "var(--good-soft)" }}>
              <div style={badgeStyle("#34d399")}>Now</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{active.title}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 2 }}>{active.note}</div>
              <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                {[active.location, active.priority, active.type].map((t, i) => (
                  <span key={i} style={pillStyle}>{t}</span>
                ))}
              </div>
              <ActiveTimer start={active.start} end={active.end} date={selectedDate} />
            </div>
          )}
          {nextBlock && (
            <div style={{ ...cardStyle, borderLeft: "3px solid var(--accent)", background: "var(--accent-soft)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={badgeStyle("var(--accent)")}>Up Next</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 650 }}>{nextBlock.title}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)" }}>{nextBlock.start} - {nextBlock.end}</div>
              <NextCountdown start={nextBlock.start} date={selectedDate} />
            </div>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={labelStyle}>Focus</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--warn)" }}>{(deskMins / 60).toFixed(1)}h</div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{blocks.filter(b => b.location === "desk").length} desk blocks</div>
        </div>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={labelStyle}>Done</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent)" }}>{blocks.length > 0 ? `${Math.round((doneCount / blocks.length) * 100)}%` : "--"}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{doneCount} / {blocks.length}</div>
        </div>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={labelStyle}>Blocks</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{blocks.length}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{blocks.filter(b => b.priority === "must").length} must &middot; {blocks.filter(b => b.type === "prayer").length} prayer</div>
        </div>
      </div>

      {/* Type Chart */}
      {totalTypeMins > 0 && (
        <div style={{ ...cardStyle, marginBottom: 12 }}>
          <div style={labelStyle}>Block types</div>
          <div style={{ display: "flex", gap: 2, height: 24, borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
            {Object.entries(typeMins).sort((a, b) => b[1] - a[1]).map(([type, mins]) => (
              <div key={type} style={{ flex: mins, background: TYPE_COLORS[type] ?? "#888", minWidth: 3 }} title={`${type}: ${(mins / 60).toFixed(1)}h`} />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {Object.entries(typeMins).sort((a, b) => b[1] - a[1]).map(([type, mins]) => (
              <span key={type} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.66rem", color: "var(--text-muted)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: TYPE_COLORS[type] ?? "#888", display: "inline-block" }} />
                {type} {(mins / 60).toFixed(1)}h
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {blocks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "2rem", opacity: 0.3, marginBottom: 8 }}>&#128197;</div>
          <p style={{ fontSize: "0.85rem" }}>No schedule for this date. Use the chat to build one.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {blocks.map(b => {
            const s = timeToDate(selectedDate, b.start);
            const e = timeToDate(selectedDate, b.end);
            const isCurrent = now >= s && now < e;
            const isMissed = !b.completed && !isCurrent && now >= e;
            const isPrayer = b.type === "prayer";

            let bg = "transparent";
            let border = "1px solid transparent";
            if (isCurrent) { bg = "var(--good-soft)"; border = "1px solid var(--good)"; }
            else if (isMissed) { bg = "var(--danger-soft)"; border = "1px solid var(--danger)"; }

            return (
              <div key={b.id} style={{
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
                <button
                  onClick={() => toggleMutation.mutate({ id: b.id })}
                  style={{
                    width: 26, height: 26, borderRadius: "50%",
                    border: `1px solid ${b.completed ? "var(--good)" : "var(--border)"}`,
                    background: b.completed ? "var(--good-soft)" : "transparent",
                    color: b.completed ? "var(--good)" : "var(--text)",
                    cursor: "pointer", display: "grid", placeItems: "center",
                    fontSize: "0.75rem", padding: 0,
                  }}
                >
                  {b.completed ? "\u2713" : ""}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{time}</span>;
}

function ActiveTimer({ start, end, date }: { start: string; end: string; date: string }) {
  const [label, setLabel] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setLabel(durationLabel(timeToDate(date, end).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [start, end, date]);
  return <div style={{ fontSize: "2rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", marginTop: 6 }}>{label}</div>;
}

function NextCountdown({ start, date }: { start: string; date: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = timeToDate(date, start).getTime() - Date.now();
      setLabel(diff > 0 ? `in ${durationLabel(diff)}` : "starting");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [start, date]);
  return <div style={{ fontSize: "1.2rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--accent)", marginTop: 4 }}>{label}</div>;
}

// --- Styles ---

const cardStyle: React.CSSProperties = {
  background: "var(--surface-1)", border: "1px solid var(--border)",
  borderRadius: 6, padding: 14,
};

const btnStyle: React.CSSProperties = {
  background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)",
  borderRadius: 4, padding: "5px 10px", cursor: "pointer", fontSize: "0.85rem",
};

const navBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: "50%",
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--text)", cursor: "pointer", display: "grid",
  placeItems: "center", fontSize: "0.85rem",
};

const pillStyle: React.CSSProperties = {
  padding: "2px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 600,
  background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.7px", color: "var(--text-muted)", marginBottom: 4,
};

const badgeStyle = (color: string): React.CSSProperties => ({
  fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "1px", color, marginBottom: 6,
});
