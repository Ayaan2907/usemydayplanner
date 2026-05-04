"use client";
import { useState, useRef } from "react";

interface BlockCardProps {
  block: { id: string; blockId: string; start: string; end: string; title: string; note: string; location: string; priority: string; type: string; completed: boolean };
  date: string;
  isCurrent: boolean;
  isMissed: boolean;
  onToggle: () => void;
  onUpdate?: (id: string, fields: Record<string, string>) => void;
}

export function BlockCard({ block: b, date, isCurrent, isMissed, onToggle, onUpdate }: BlockCardProps) {
  const isPrayer = b.type === "prayer";
  const [editingField, setEditingField] = useState<string | null>(null);

  let bg = "transparent";
  let border = "1px solid transparent";
  if (isCurrent) { bg = "var(--good-soft)"; border = "1px solid var(--good)"; }
  else if (isMissed) { bg = "var(--danger-soft)"; border = "1px solid var(--danger)"; }

  function handleDoubleClick(field: string) {
    if (onUpdate) setEditingField(field);
  }

  function handleSave(field: string, value: string) {
    setEditingField(null);
    if (onUpdate && value.trim()) {
      onUpdate(b.id, { [field]: value.trim() });
    }
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "80px 1fr 28px",
      gap: 8, alignItems: "center", padding: "8px 10px",
      borderRadius: 4, background: bg, border,
      borderLeft: isPrayer ? "3px solid var(--good)" : undefined,
      opacity: b.completed ? 0.45 : 1,
      transition: "background 120ms ease",
    }}>
      {/* Time */}
      <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
        {editingField === "start" ? (
          <EditableInput value={b.start} onSave={(v) => handleSave("start", v)} />
        ) : (
          <span onDoubleClick={() => handleDoubleClick("start")} style={{ cursor: onUpdate ? "text" : "default" }}>
            {b.start} - {b.end}
          </span>
        )}
        {isPrayer && <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", color: "var(--good)", marginTop: 2, letterSpacing: "0.8px" }}>anchor</div>}
      </div>

      {/* Content */}
      <div>
        {editingField === "title" ? (
          <EditableInput value={b.title} onSave={(v) => handleSave("title", v)} style={{ fontSize: "0.85rem", fontWeight: 600 }} />
        ) : (
          <div onDoubleClick={() => handleDoubleClick("title")} style={{ fontSize: "0.85rem", fontWeight: 600, cursor: onUpdate ? "text" : "default" }}>{b.title}</div>
        )}
        {editingField === "note" ? (
          <EditableInput value={b.note} onSave={(v) => handleSave("note", v)} style={{ fontSize: "0.72rem" }} />
        ) : (
          b.note && <div onDoubleClick={() => handleDoubleClick("note")} style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2, cursor: onUpdate ? "text" : "default" }}>{b.note}</div>
        )}
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.3px" }}>
          {b.location} &middot; {b.priority} &middot; {b.type}
        </div>
      </div>

      {/* Check */}
      <button onClick={onToggle} style={{
        width: 26, height: 26, borderRadius: "50%",
        border: `1px solid ${b.completed ? "var(--good)" : "var(--border)"}`,
        background: b.completed ? "var(--good-soft)" : "transparent",
        color: b.completed ? "var(--good)" : "var(--text)",
        cursor: "pointer", display: "grid", placeItems: "center",
        fontSize: "0.75rem", padding: 0,
      }}>
        {b.completed ? "\u2713" : ""}
      </button>
    </div>
  );
}

/** Inline editable input — renders on double-click, saves on Enter/blur */
function EditableInput({ value, onSave, style }: { value: string; onSave: (v: string) => void; style?: React.CSSProperties }) {
  const ref = useRef<HTMLInputElement>(null);
  const [val, setVal] = useState(value);

  return (
    <input
      ref={ref}
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onSave(val)}
      onKeyDown={(e) => { if (e.key === "Enter") onSave(val); if (e.key === "Escape") onSave(value); }}
      style={{
        width: "100%", background: "var(--input-bg)", color: "var(--text)",
        border: "1px solid var(--accent)", borderRadius: 3,
        padding: "2px 6px", outline: "none", fontFamily: "var(--font-sans)",
        ...style,
      }}
    />
  );
}
