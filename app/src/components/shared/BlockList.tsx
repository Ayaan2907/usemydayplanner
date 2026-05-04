"use client";
import { BlockCard } from "./BlockCard";
import { timeToDate } from "~/lib/utils";

interface Block { id: string; blockId: string; start: string; end: string; title: string; note: string; location: string; priority: string; type: string; completed: boolean }

interface BlockListProps {
  blocks: Block[];
  date: string;
  activeId: string | undefined;
  onToggle: (id: string) => void;
  onUpdateBlock?: (id: string, fields: Record<string, string>) => void;
}

export function BlockList({ blocks, date, activeId, onToggle, onUpdateBlock }: BlockListProps) {
  const now = new Date();

  if (blocks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "1.8rem", opacity: 0.3, marginBottom: 8 }}>&#128197;</div>
        <p style={{ fontSize: "0.85rem" }}>No schedule for this date.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {blocks.map(b => {
        const isCurrent = b.id === activeId;
        const e = timeToDate(date, b.end);
        const isMissed = !b.completed && !isCurrent && now >= e;
        return <BlockCard key={b.id} block={b} date={date} isCurrent={isCurrent} isMissed={isMissed} onToggle={() => onToggle(b.id)} onUpdate={onUpdateBlock} />;
      })}
    </div>
  );
}
