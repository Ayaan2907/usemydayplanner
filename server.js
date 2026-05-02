import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct";

// --- Prayer times cache (in-memory, per date+location) ---
const prayerCache = new Map();

function prayerCacheKey(date, lat, lng) {
  return `${date}_${lat}_${lng}`;
}

async function fetchPrayerTimes(date, lat, lng) {
  const key = prayerCacheKey(date, lat, lng);
  if (prayerCache.has(key)) return prayerCache.get(key);

  const [year, month, day] = date.split("-");
  const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Aladhan API error: ${res.status}`);
  const data = await res.json();
  const t = data.data.timings;
  const times = {
    Fajr: t.Fajr,
    Sunrise: t.Sunrise,
    Dhuhr: t.Dhuhr,
    Asr: t.Asr,
    Maghrib: t.Maghrib,
    Isha: t.Isha,
  };
  prayerCache.set(key, times);
  return times;
}

function buildSystemPrompt(prayerTimes) {
  const prayerList = Object.entries(prayerTimes)
    .filter(([k]) => k !== "Sunrise")
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  return `You are a daily schedule planning agent. The user will describe what they need to do tomorrow (or a specific day) in natural language. Your job is to build a complete daily schedule.

PRAYER TIMES (from Aladhan API for user's location — these are IMMOVABLE):
${prayerList}

RULES:
1. Prayer blocks are IMMOVABLE anchor points. Schedule everything else around them. Each prayer block should be 15-20 minutes (prayer name + salah).
2. Include a "Wake + wudu" block before Fajr (5 min).
3. Include a "Shutdown review + tomorrow prep" block at end of day (20 min).
4. Blocks must NOT overlap.
5. Cover the full wake-to-sleep window.
6. Every block needs all fields.

RESPONSE FORMAT:
First, respond conversationally (2-3 sentences max) acknowledging what the user wants.
Then output a JSON code block with the schedule:

\`\`\`json
[
  {
    "id": "unique-kebab-case-id",
    "start": "HH:MM",
    "end": "HH:MM",
    "title": "Block title",
    "note": "One-line guidance or context",
    "location": "desk" or "away",
    "priority": "must" or "should" or "stretch",
    "type": "prayer" or "routine" or "build" or "company" or "personal" or "logistics" or "recovery" or "review" or "spiritual" or "execution" or "admin" or "r&d" or "visibility"
  }
]
\`\`\`

If the user asks to modify an existing schedule (move, add, remove blocks), return the FULL updated schedule JSON, not just the diff. Always return the complete day.`;
}

// --- Routes ---

app.get("/api/prayer-times", async (req, res) => {
  try {
    const { date, lat, lng } = req.query;
    if (!date || !lat || !lng) return res.status(400).json({ error: "date, lat, lng required" });
    const times = await fetchPrayerTimes(date, parseFloat(lat), parseFloat(lng));
    res.json(times);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, date, lat, lng } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages array required" });
    if (!OPENROUTER_KEY || OPENROUTER_KEY === "your-key-here") return res.status(500).json({ error: "OPENROUTER_API_KEY not set in .env" });

    // Fetch prayer times (defaults to Houston if no location)
    const pLat = lat || 29.7604;
    const pLng = lng || -95.3698;
    const pDate = date || new Date().toISOString().split("T")[0];
    const prayerTimes = await fetchPrayerTimes(pDate, pLat, pLng);
    const systemPrompt = buildSystemPrompt(prayerTimes);

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
      return res.status(response.status).json({ error: `OpenRouter error: ${err}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Day Planner running at http://localhost:${PORT}`));
