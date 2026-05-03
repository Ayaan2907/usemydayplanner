"use client";
import { useState, useRef, useEffect } from "react";
import { useChatAgent } from "~/hooks/useChatAgent";
import { BlockList } from "~/components/shared/BlockList";
import { StatsRow } from "~/components/shared/StatsRow";
import { TypeChart } from "~/components/shared/TypeChart";
import { TYPE_COLORS } from "~/lib/constants";
import type { useSchedule } from "~/hooks/useSchedule";

interface ChatViewProps {
  date: string;
  schedule: ReturnType<typeof useSchedule>;
  onShiftDate: (offset: number) => void;
  location: { lat: number | null; lng: number | null };
  onScheduleParsed: (parsed: any) => void;
}

export function ChatView({ date, schedule, onShiftDate, location, onScheduleParsed }: ChatViewProps) {
  const [input, setInput] = useState("");
  const [sideTab, setSideTab] = useState<"schedule" | "stats">("schedule");
  const { messages, send, loading } = useChatAgent(date, location, onScheduleParsed);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)", marginTop: 48 }}>
      {/* Chat column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Day Planner Agent</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{schedule.blocks.length} blocks planned</div>
          </div>
          {schedule.completionPct > 0 && (
            <span style={{ padding: "4px 10px", borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>
              {schedule.completionPct}% done
            </span>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              {msg.role === "user" ? (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: "var(--accent-soft)", border: "1px solid var(--accent)", color: "var(--text)", padding: "10px 16px", borderRadius: "16px 16px 4px 16px", fontSize: 14, maxWidth: "70%" }}>{msg.content}</div>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: "85%", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{msg.content}</div>
              )}
            </div>
          ))}
          {loading && <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Thinking...</div>}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 20px", display: "flex", gap: 10 }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); setInput(""); } }}
            placeholder="What does your day look like?"
            disabled={loading}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "var(--font-sans)" }}
          />
          <button onClick={() => { void send(input); setInput(""); }} disabled={loading}
            style={{ padding: "10px 20px", borderRadius: 20, border: "none", background: "var(--accent)", color: "white", fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}>
            Send
          </button>
        </div>
      </div>

      {/* Schedule sidebar */}
      <div style={{ width: 360, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 0 }}>
            {(["schedule", "stats"] as const).map((tab, i) => (
              <button key={tab} onClick={() => setSideTab(tab)}
                style={{ padding: "6px 14px", border: "none", background: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", color: sideTab === tab ? "var(--accent)" : "var(--text-muted)", borderBottom: sideTab === tab ? "2px solid var(--accent)" : "2px solid transparent", textTransform: "capitalize", fontFamily: "var(--font-sans)" }}>
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {sideTab === "schedule" && (
            <>
              <TypeChart typeMins={schedule.typeMins} />
              <div style={{ marginTop: 12 }}>
                <BlockList blocks={schedule.blocks} date={date} activeId={schedule.active?.id} onToggle={schedule.toggleBlock} />
              </div>
            </>
          )}
          {sideTab === "stats" && (
            <StatsRow deskMins={schedule.deskMins} deskBlockCount={schedule.deskBlockCount} doneCount={schedule.doneCount} totalBlocks={schedule.blocks.length} completionPct={schedule.completionPct} mustCount={schedule.mustCount} prayerCount={schedule.prayerCount} />
          )}
        </div>
      </div>
    </div>
  );
}
