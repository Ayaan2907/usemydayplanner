import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { buildSystemPrompt } from "~/lib/agent-prompt";
import type { PrayerTimes } from "~/lib/types";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct";

// Prayer times cache
const prayerCache = new Map<string, PrayerTimes>();

async function fetchPrayerTimes(date: string, lat: number, lng: number): Promise<PrayerTimes | null> {
  const key = `${date}_${lat}_${lng}`;
  if (prayerCache.has(key)) return prayerCache.get(key)!;

  try {
    const [year, month, day] = date.split("-");
    const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=2`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as { data: { timings: Record<string, string> } };
    const t = data.data.timings;
    const times: PrayerTimes = {
      Fajr: t.Fajr!, Sunrise: t.Sunrise!, Dhuhr: t.Dhuhr!,
      Asr: t.Asr!, Maghrib: t.Maghrib!, Isha: t.Isha!,
    };
    prayerCache.set(key, times);
    return times;
  } catch {
    return null;
  }
}

function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      messages: { role: string; content: string }[];
      date: string;
      lat?: number | null;
      lng?: number | null;
    };

    const { messages, date, lat, lng } = body;
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }
    if (!OPENROUTER_KEY || OPENROUTER_KEY === "your-key-here") {
      return NextResponse.json({ error: "OPENROUTER_API_KEY not set" }, { status: 500 });
    }

    // Fetch prayer times
    const pLat = lat ?? 29.7604;
    const pLng = lng ?? -95.3698;
    const prayerTimes = await fetchPrayerTimes(date, pLat, pLng);

    // Get pattern insights from DB
    const patternLogs = await db.patternLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const byType: Record<string, { completed: number; total: number }> = {};
    for (const log of patternLogs) {
      if (!byType[log.blockType]) byType[log.blockType] = { completed: 0, total: 0 };
      byType[log.blockType]!.total++;
      if (log.action === "completed") byType[log.blockType]!.completed++;
    }
    const patternInsights = Object.entries(byType).map(([type, stats]) => ({
      type,
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }));

    // Get existing schedule for this date
    const existing = await db.schedule.findUnique({
      where: { date },
      include: { blocks: { orderBy: { sortOrder: "asc" } } },
    });

    const existingSchedule = existing
      ? {
          title: existing.title,
          blocks: existing.blocks.map(b => ({
            title: b.title, start: b.start, end: b.end, type: b.type,
          })),
        }
      : null;

    // Build system prompt with full context
    const systemPrompt = buildSystemPrompt({
      date,
      dayOfWeek: getDayOfWeek(date),
      prayerTimes,
      patternInsights,
      existingSchedule,
      todayStr: new Date().toISOString().split("T")[0]!,
    });

    // Call OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `OpenRouter error: ${err}` }, { status: response.status });
    }

    const data = (await response.json()) as { choices: { message: { content: string } }[] };
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
