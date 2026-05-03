"use client";
import { useState, useRef, useEffect } from "react";
import { useChatAgent } from "~/hooks/useChatAgent";

interface ChatDrawerProps {
  date: string;
  location: { lat: number | null; lng: number | null };
  onScheduleParsed: (parsed: {
    dayTitle?: string; dayNote?: string;
    blocks: { blockId: string; start: string; end: string; title: string; note?: string; location: string; priority: string; type: string }[];
  }) => void;
}

export function ChatDrawer({ date, location, onScheduleParsed }: ChatDrawerProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, send, loading } = useChatAgent(date, location, onScheduleParsed);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <aside style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      height: open ? "45vh" : 56,
      background: "var(--surface-1)", borderTop: "1px solid var(--border)",
      zIndex: 50, display: "flex", flexDirection: "column",
      transition: "height 300ms ease",
    }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", justifyContent: "center", padding: 6, cursor: "pointer" }}>
        <div style={{ width: 36, height: 4, borderRadius: 9999, background: "var(--border)" }} />
      </div>
      <div style={{ display: "flex", gap: 6, padding: "4px 16px 8px", flexShrink: 0 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => !open && setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); setInput(""); } }}
          placeholder="Plan my day..."
          disabled={loading}
          style={{
            flex: 1, background: "var(--input-bg)", color: "var(--text)",
            border: "1px solid var(--border)", borderRadius: 4,
            padding: "8px 10px", fontSize: "0.85rem", outline: "none",
            fontFamily: "var(--font-sans)",
          }}
        />
        <button
          onClick={() => { void send(input); setInput(""); }}
          disabled={loading}
          style={{
            background: "var(--text)", color: "var(--bg)",
            border: "1px solid var(--border)", borderRadius: 4,
            padding: "8px 14px", fontSize: "0.82rem", fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1, fontFamily: "var(--font-sans)",
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
      {open && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              maxWidth: "85%", padding: "8px 12px", borderRadius: 6,
              fontSize: "0.85rem", lineHeight: 1.5, whiteSpace: "pre-wrap",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              background: msg.role === "user" ? "var(--accent-soft)" : "var(--surface-2)",
              border: `1px solid ${msg.role === "user" ? "var(--accent)" : "var(--border)"}`,
            }}>
              {msg.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start", padding: "8px 12px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Thinking...
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}
    </aside>
  );
}
