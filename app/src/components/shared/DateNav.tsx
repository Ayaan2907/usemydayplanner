"use client";
import { formatDateShort } from "~/lib/utils";

interface DateNavProps {
  dateStr: string;
  onPrev: () => void;
  onNext: () => void;
}

export function DateNav({ dateStr, onPrev, onNext }: DateNavProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button onClick={onPrev} style={navBtnStyle}>&larr;</button>
      <span style={{ fontSize: "0.85rem", fontWeight: 600, minWidth: 120, textAlign: "center" }}>{formatDateShort(dateStr)}</span>
      <button onClick={onNext} style={navBtnStyle}>&rarr;</button>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: "50%",
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--text)", cursor: "pointer", display: "grid",
  placeItems: "center", fontSize: "0.85rem",
};
