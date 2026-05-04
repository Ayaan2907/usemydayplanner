"use client";
/**
 * T3 CONCEPT: This hook calls a Next.js API route (/api/chat) directly via fetch,
 * NOT tRPC. Why? Because the chat endpoint proxies to OpenRouter (external API)
 * and streams back unstructured text + JSON. tRPC is better for typed DB queries.
 * API routes (`app/api/chat/route.ts`) are raw Next.js handlers — same as Express routes.
 */
import { useState, useRef, useCallback } from "react";
import { formatDateShort } from "~/lib/utils";

interface ChatMsg { role: "user" | "agent"; content: string }

export interface ParsedSchedule {
  targetDate?: string;
  dayTitle?: string;
  dayNote?: string;
  blocks: { blockId: string; start: string; end: string; title: string; note?: string; location: string; priority: string; type: string }[];
}

export function useChatAgent(
  date: string,
  location: { lat: number | null; lng: number | null },
  onScheduleParsed: (parsed: ParsedSchedule) => void,
) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "agent", content: "What does your day look like? Tell me what you need to do." },
  ]);
  const [loading, setLoading] = useState(false);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);
    historyRef.current = [...historyRef.current, { role: "user", content: text }];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyRef.current, date, lat: location.lat, lng: location.lng }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error);
      }

      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      const content = data.choices?.[0]?.message?.content ?? "No response.";
      historyRef.current = [...historyRef.current, { role: "assistant", content }];

      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]!) as ParsedSchedule;
          if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
            onScheduleParsed(parsed);
            const textPart = content.replace(/```json[\s\S]*?```/, "").trim();
            setMessages(prev => [...prev, { role: "agent", content: `${textPart}\n\n[Schedule saved: ${parsed.blocks.length} blocks for ${formatDateShort(date)}]` }]);
            return;
          }
        } catch { /* parse failed */ }
      }

      const textPart = content.replace(/```json[\s\S]*?```/, "").trim();
      setMessages(prev => [...prev, { role: "agent", content: textPart }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages(prev => [...prev, { role: "agent", content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }, [date, location, loading, onScheduleParsed]);

  return { messages, send, loading };
}
