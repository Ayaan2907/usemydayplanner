"use client";
import { useTimer } from "~/hooks/useTimer";
import { timeToDate } from "~/lib/utils";

interface Block { id: string; start: string; end: string; title: string; note: string; location: string; priority: string; type: string }

interface NowNextCardsProps {
  active: Block | undefined;
  nextBlock: Block | undefined;
  date: string;
}

export function NowNextCards({ active, nextBlock, date }: NowNextCardsProps) {
  if (!active && !nextBlock) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: active && nextBlock ? "1.6fr 1fr" : "1fr", gap: 8 }}>
      {active && <NowCard block={active} date={date} />}
      {nextBlock && <NextCard block={nextBlock} date={date} />}
    </div>
  );
}

function NowCard({ block, date }: { block: Block; date: string }) {
  const endMs = timeToDate(date, block.end).getTime();
  const startMs = timeToDate(date, block.start).getTime();
  const { label } = useTimer(endMs);
  const pct = Math.min(100, ((Date.now() - startMs) / (endMs - startMs)) * 100);

  return (
    <div style={{ ...cardStyle, borderLeft: "3px solid var(--good)", background: "var(--good-soft)" }}>
      <div style={badgeStyle("var(--good)")}>Now</div>
      <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
        {[block.location, block.priority, block.type].map((t, i) => <span key={i} style={pillStyle}>{t}</span>)}
      </div>
      <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{block.title}</div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 2 }}>{block.note}</div>
      <div style={{ fontSize: "2rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", marginTop: 6 }}>{label}</div>
      <div style={{ height: 4, borderRadius: 9999, background: "var(--surface-3)", overflow: "hidden", marginTop: 8 }}>
        <div style={{ height: "100%", borderRadius: 9999, background: "var(--accent)", width: `${pct}%`, transition: "width 300ms ease" }} />
      </div>
    </div>
  );
}

function NextCard({ block, date }: { block: Block; date: string }) {
  const startMs = timeToDate(date, block.start).getTime();
  const { label } = useTimer(startMs);

  return (
    <div style={{ ...cardStyle, borderLeft: "3px solid var(--accent)", background: "var(--accent-soft)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={badgeStyle("var(--accent)")}>Up Next</div>
      <div style={{ fontSize: "0.95rem", fontWeight: 650 }}>{block.title}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)" }}>{block.start} - {block.end}</div>
      <div style={{ fontSize: "1.2rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--accent)", marginTop: 4 }}>
        in {label}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 6, padding: 14 };
const pillStyle: React.CSSProperties = { padding: "2px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 600, background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" };
const badgeStyle = (color: string): React.CSSProperties => ({ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color, marginBottom: 6 });
