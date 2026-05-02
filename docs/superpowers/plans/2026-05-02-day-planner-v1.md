# Day Planner V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a conversational AI schedule builder — speak/type to an agent, get an interactive daily schedule rendered in browser with prayer-anchored blocks, life progress bars, and dashboard cards.

**Architecture:** Express server (~100 lines) proxies chat to OpenRouter API and fetches prayer times from Aladhan API. Single `public/index.html` renders everything — chat panel, schedule timeline, dashboards. No build step, no frameworks.

**Tech Stack:** Node.js, Express, dotenv, OpenRouter API, Aladhan API, vanilla HTML/CSS/JS, Web Speech API, Notification API, AudioContext.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies (express, dotenv), scripts |
| `.env` | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |
| `server.js` | Express: serve static, POST /api/chat (OpenRouter proxy), GET /api/prayer-times (Aladhan proxy + cache) |
| `public/index.html` | Entire frontend: CSS + HTML + JS in one file. Chat panel, schedule renderer, dashboards, notifications, voice input |

---

### Task 1: Project scaffolding + Express server

**Files:**
- Create: `package.json`
- Create: `.env`
- Create: `server.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "day-planner",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "dotenv": "^16.4.0"
  }
}
```

- [ ] **Step 2: Create .env**

```
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct
```

- [ ] **Step 3: Create server.js**

```javascript
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

  const [day, month, year] = date.split("-"); // YYYY-MM-DD -> DD-MM-YYYY
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
    if (!OPENROUTER_KEY) return res.status(500).json({ error: "OPENROUTER_API_KEY not set in .env" });

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
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, lock file generated.

- [ ] **Step 5: Test server starts**

Run: `node server.js`
Expected: `Day Planner running at http://localhost:3000`

- [ ] **Step 6: Commit**

```bash
git add package.json server.js .env .gitignore .impeccable.md day-manager.html day-manager-evolution-prompt.md docs/
git commit -m "feat: project scaffolding + Express server with OpenRouter proxy and Aladhan prayer times"
```

---

### Task 2: Frontend — HTML shell + CSS design system

**Files:**
- Create: `public/index.html` (CSS + HTML structure only, JS in next tasks)

- [ ] **Step 1: Create public/index.html with full CSS and HTML structure**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Day Planner</title>
  <style>
    :root {
      --bg: #070b17;
      --bg-2: #10182f;
      --panel: rgba(255, 255, 255, 0.08);
      --panel-strong: rgba(255, 255, 255, 0.12);
      --text: #ebf1ff;
      --muted: #a8b3cf;
      --good: #32d6a0;
      --warn: #ffd166;
      --focus: #7aa2ff;
      --danger: #ff6b81;
      --ring: rgba(122, 162, 255, 0.35);
      --shadow: 0 12px 34px rgba(0, 0, 0, 0.32);
      --font-sans: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --radius-sm: 10px;
      --radius-md: 12px;
      --radius-lg: 18px;
      --radius-pill: 999px;
      --ease-fast: 150ms ease;
      --ease-normal: 210ms ease;
      --ease-slow: 300ms ease;
    }

    * { box-sizing: border-box; margin: 0; }

    html, body {
      height: 100%;
      font-family: var(--font-sans);
      color: var(--text);
      background:
        radial-gradient(1200px 700px at 80% -10%, #1a2f63 0%, transparent 58%),
        radial-gradient(900px 500px at -10% 0%, #1a4c56 0%, transparent 52%),
        linear-gradient(165deg, var(--bg), var(--bg-2));
    }

    /* --- Layout --- */
    .app {
      display: grid;
      grid-template-columns: 340px 1fr;
      grid-template-rows: auto 1fr;
      height: 100vh;
      gap: 0;
    }

    .header {
      grid-column: 1 / -1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .header h1 {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .clock {
      font-family: var(--font-mono);
      font-size: 0.95rem;
      font-variant-numeric: tabular-nums;
      color: var(--muted);
    }

    .location-bar {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .location-bar input {
      width: 120px;
      padding: 5px 8px;
      font-size: 0.8rem;
      color: var(--text);
      background: rgba(10, 14, 30, 0.7);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: var(--radius-sm);
      outline: none;
    }

    .location-bar input:focus {
      border-color: var(--focus);
      box-shadow: 0 0 0 2px var(--ring);
    }

    .location-bar button {
      padding: 5px 10px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text);
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    /* --- Chat Panel --- */
    .chat {
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.15);
      overflow: hidden;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .msg {
      max-width: 95%;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .msg.user {
      align-self: flex-end;
      background: linear-gradient(135deg, #2b66ff, #39a9d8);
      border: 1px solid rgba(122,162,255,0.4);
    }

    .msg.agent {
      align-self: flex-start;
      background: var(--panel-strong);
      border: 1px solid rgba(255,255,255,0.12);
    }

    .msg.agent .schedule-preview {
      margin-top: 8px;
      padding: 8px;
      background: rgba(0,0,0,0.3);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: var(--good);
    }

    .chat-input-row {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.1);
    }

    .chat-input-row input {
      flex: 1;
      padding: 10px 12px;
      font-size: 0.9rem;
      color: var(--text);
      background: rgba(10,14,30,0.7);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: var(--radius-sm);
      outline: none;
    }

    .chat-input-row input:focus {
      border-color: var(--focus);
      box-shadow: 0 0 0 3px var(--ring);
    }

    .chat-input-row input::placeholder { color: rgba(168,179,207,0.5); }

    .btn {
      padding: 9px 14px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: transform var(--ease-fast), border-color var(--ease-normal), background var(--ease-normal);
      background: rgba(255,255,255,0.08);
    }

    .btn:hover {
      transform: translateY(-1px);
      border-color: rgba(255,255,255,0.36);
      background: rgba(255,255,255,0.14);
    }

    .btn-primary {
      background: linear-gradient(135deg, #2b66ff, #39a9d8);
      border-color: rgba(122,162,255,0.55);
    }

    .btn-good {
      background: linear-gradient(135deg, #0ea172, #2cb58b);
      border-color: rgba(66,237,178,0.5);
    }

    .btn-mic {
      width: 40px;
      padding: 0;
      display: grid;
      place-items: center;
      font-size: 1.1rem;
      border-radius: 50%;
    }

    .btn-mic.listening {
      border-color: var(--danger);
      box-shadow: 0 0 0 4px rgba(255,107,129,0.25);
      animation: pulse 1.2s infinite;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 4px rgba(255,107,129,0.25); }
      50% { box-shadow: 0 0 0 8px rgba(255,107,129,0.1); }
    }

    /* --- Right Panel (schedule) --- */
    .schedule {
      overflow-y: auto;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* --- Life Progress Bars --- */
    .life-bars {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .life-bar {
      display: grid;
      grid-template-columns: 60px 1fr auto;
      align-items: center;
      gap: 10px;
    }

    .life-bar-label {
      font-size: 0.78rem;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .life-bar-track {
      height: 8px;
      border-radius: var(--radius-pill);
      background: rgba(255,255,255,0.1);
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.06);
    }

    .life-bar-fill {
      height: 100%;
      border-radius: var(--radius-pill);
      background: linear-gradient(90deg, #5f9bff, #61e0b3);
      transition: width var(--ease-slow);
    }

    .life-bar-value {
      font-size: 0.75rem;
      font-family: var(--font-mono);
      color: var(--muted);
      min-width: 90px;
      text-align: right;
    }

    /* --- Card --- */
    .card {
      background: var(--panel);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow);
      backdrop-filter: blur(8px);
      padding: 16px;
    }

    .card h3 {
      font-size: 0.85rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 10px;
    }

    /* --- Current Block --- */
    .current-block { display: grid; gap: 10px; }
    .current-block .block-title { font-size: 1.2rem; font-weight: 700; }
    .current-block .block-note { color: var(--muted); font-size: 0.88rem; line-height: 1.4; }

    .current-block .timer {
      font-size: 1.8rem;
      font-weight: 780;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.5px;
    }

    .pills { display: flex; flex-wrap: wrap; gap: 6px; }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      border: 1px solid rgba(255,255,255,0.15);
      font-size: 0.78rem;
      background: rgba(255,255,255,0.05);
    }

    .pill-good { border-color: rgba(50,214,160,0.45); color: #b9ffe5; background: rgba(50,214,160,0.16); }
    .pill-warn { border-color: rgba(255,209,102,0.5); color: #fff3c7; background: rgba(255,209,102,0.15); }

    .progress-track {
      height: 6px;
      border-radius: var(--radius-pill);
      background: rgba(255,255,255,0.1);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #5f9bff, #61e0b3);
      transition: width var(--ease-slow);
    }

    /* --- Dashboard Row --- */
    .dash-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .dash-card { text-align: center; }

    .dash-card .dash-value {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .dash-card .dash-label {
      font-size: 0.75rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    /* Progress ring */
    .ring-wrap { display: flex; justify-content: center; padding: 4px 0; }

    .ring-svg {
      width: 72px;
      height: 72px;
      transform: rotate(-90deg);
    }

    .ring-bg {
      fill: none;
      stroke: rgba(255,255,255,0.08);
      stroke-width: 6;
    }

    .ring-fill {
      fill: none;
      stroke: url(#ringGrad);
      stroke-width: 6;
      stroke-linecap: round;
      transition: stroke-dashoffset var(--ease-slow);
    }

    .ring-text {
      font-size: 0.85rem;
      font-weight: 700;
      fill: var(--text);
    }

    /* Week dots */
    .week-dots { display: flex; justify-content: center; gap: 8px; padding: 8px 0; }

    .week-dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.15);
      display: grid;
      place-items: center;
      font-size: 0.65rem;
      font-weight: 600;
      cursor: pointer;
      transition: border-color var(--ease-fast), background var(--ease-fast);
    }

    .week-dot:hover { border-color: var(--focus); }
    .week-dot.planned { border-color: var(--good); background: rgba(50,214,160,0.15); }
    .week-dot.today { border-color: var(--warn); background: rgba(255,209,102,0.18); color: #fff3c7; }
    .week-dot.empty { border-color: rgba(255,255,255,0.08); color: var(--muted); }

    /* --- Timeline --- */
    .timeline { display: flex; flex-direction: column; gap: 6px; }

    .tl-item {
      display: grid;
      grid-template-columns: 90px 1fr 32px;
      gap: 10px;
      align-items: center;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.03);
      transition: border-color var(--ease-fast), background var(--ease-fast);
    }

    .tl-item.current {
      border-color: rgba(97,224,179,0.54);
      background: rgba(97,224,179,0.1);
    }

    .tl-item.done { opacity: 0.5; }

    .tl-item.missed {
      border-color: rgba(255,107,129,0.4);
      background: rgba(255,107,129,0.08);
    }

    .tl-time {
      font-size: 0.8rem;
      font-family: var(--font-mono);
      color: #c7d7ff;
    }

    .tl-title {
      font-size: 0.88rem;
      font-weight: 600;
      line-height: 1.3;
    }

    .tl-note {
      font-size: 0.75rem;
      color: var(--muted);
      margin-top: 2px;
    }

    .tl-meta {
      font-size: 0.68rem;
      color: var(--muted);
      margin-top: 3px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .tl-check {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.3);
      background: transparent;
      color: var(--text);
      display: grid;
      place-items: center;
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0;
      transition: background var(--ease-fast), border-color var(--ease-fast);
    }

    .tl-check.done {
      background: rgba(50,214,160,0.22);
      border-color: rgba(50,214,160,0.52);
    }

    /* --- Controls Bar --- */
    .controls-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .date-nav {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.88rem;
      font-weight: 600;
    }

    .date-nav button {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.06);
      color: var(--text);
      cursor: pointer;
      display: grid;
      place-items: center;
      font-size: 0.9rem;
    }

    /* --- Toast --- */
    .toast {
      position: fixed;
      bottom: 18px;
      right: 18px;
      width: min(360px, 90vw);
      border-radius: 13px;
      padding: 12px 14px;
      background: rgba(8,14,31,0.92);
      border: 1px solid rgba(255,255,255,0.18);
      color: #f3f7ff;
      box-shadow: var(--shadow);
      transform: translateY(24px);
      opacity: 0;
      pointer-events: none;
      transition: transform var(--ease-normal), opacity var(--ease-normal);
      z-index: 100;
      font-size: 0.88rem;
    }

    .toast.show { transform: translateY(0); opacity: 1; }

    /* --- Empty state --- */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px 20px;
      color: var(--muted);
      text-align: center;
    }

    .empty-state .empty-icon { font-size: 2.5rem; opacity: 0.4; }
    .empty-state p { font-size: 0.9rem; line-height: 1.5; max-width: 300px; }

    /* --- Responsive --- */
    @media (max-width: 800px) {
      .app {
        grid-template-columns: 1fr;
        grid-template-rows: auto 280px 1fr;
      }

      .chat { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); }

      .dash-row { grid-template-columns: 1fr; }
    }

    /* --- Scrollbar --- */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
  </style>
</head>
<body>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <h1>Day Planner</h1>
      <div class="header-right">
        <div class="location-bar">
          <input id="cityInput" type="text" placeholder="City" />
          <input id="countryInput" type="text" placeholder="Country" />
          <button class="btn" id="geoBtn" title="Use my location">GPS</button>
        </div>
        <span class="clock" id="liveClock">--:--:--</span>
      </div>
    </header>

    <!-- Chat Panel -->
    <section class="chat">
      <div class="chat-messages" id="chatMessages">
        <div class="msg agent">
          <div>What does your day look like? Tell me what you need to do and I'll build your schedule around your prayer times.</div>
        </div>
      </div>
      <div class="chat-input-row">
        <button class="btn btn-mic" id="micBtn" title="Voice input">&#127908;</button>
        <input type="text" id="chatInput" placeholder="Describe your day..." autocomplete="off" />
        <button class="btn btn-primary" id="sendBtn">Send</button>
      </div>
    </section>

    <!-- Schedule Panel -->
    <main class="schedule" id="schedulePanel">
      <!-- Life Progress Bars -->
      <div class="life-bars">
        <div class="life-bar">
          <span class="life-bar-label">Day</span>
          <div class="life-bar-track"><div class="life-bar-fill" id="dayBar"></div></div>
          <span class="life-bar-value" id="dayBarLabel">--</span>
        </div>
        <div class="life-bar">
          <span class="life-bar-label">Week</span>
          <div class="life-bar-track"><div class="life-bar-fill" id="weekBar"></div></div>
          <span class="life-bar-value" id="weekBarLabel">--</span>
        </div>
        <div class="life-bar">
          <span class="life-bar-label">Year</span>
          <div class="life-bar-track"><div class="life-bar-fill" id="yearBar"></div></div>
          <span class="life-bar-value" id="yearBarLabel">--</span>
        </div>
      </div>

      <!-- Current Block -->
      <div class="card current-block" id="currentBlockCard" style="display:none;">
        <h3>Now</h3>
        <div class="pills" id="currentPills"></div>
        <div class="block-title" id="currentTitle"></div>
        <div class="block-note" id="currentNote"></div>
        <div class="timer" id="currentTimer">--:--:--</div>
        <div class="progress-track"><div class="progress-fill" id="currentProgress"></div></div>
      </div>

      <!-- Dashboard Row -->
      <div class="dash-row">
        <div class="card dash-card">
          <h3>Summary</h3>
          <div class="dash-value" id="summaryValue">--</div>
          <div class="dash-label" id="summaryLabel">blocks</div>
        </div>
        <div class="card dash-card">
          <h3>Progress</h3>
          <div class="ring-wrap">
            <svg class="ring-svg" viewBox="0 0 80 80">
              <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#5f9bff"/><stop offset="100%" stop-color="#61e0b3"/></linearGradient></defs>
              <circle class="ring-bg" cx="40" cy="40" r="34"/>
              <circle class="ring-fill" id="ringFill" cx="40" cy="40" r="34" stroke-dasharray="213.6" stroke-dashoffset="213.6"/>
            </svg>
          </div>
          <div class="dash-label" id="progressLabel">0%</div>
        </div>
        <div class="card dash-card">
          <h3>Week</h3>
          <div class="week-dots" id="weekDots"></div>
          <div class="dash-label" id="weekLabel">--</div>
        </div>
      </div>

      <!-- Controls -->
      <div class="controls-bar">
        <div class="date-nav">
          <button id="prevDay">&larr;</button>
          <span id="dateDisplay">--</span>
          <button id="nextDay">&rarr;</button>
        </div>
        <button class="btn btn-good" id="saveBtn">Save</button>
        <button class="btn" id="notifyBtn">Notifications</button>
      </div>

      <!-- Timeline -->
      <div id="timelineWrap">
        <div class="empty-state" id="emptyState">
          <div class="empty-icon">&#128197;</div>
          <p>No schedule yet. Tell the agent what your day looks like and it will build one for you.</p>
        </div>
        <div class="timeline" id="timeline" style="display:none;"></div>
      </div>
    </main>
  </div>

  <div class="toast" id="toast"></div>

  <!-- SVG gradient for progress ring (referenced by ring-fill) is inline above -->

  <script>
    // JS will be added in Tasks 3-6
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify it renders**

Run: `node server.js` and open `http://localhost:3000` in browser.
Expected: Dark glassmorphism layout with chat panel on left, empty schedule panel on right. Life progress bars visible but showing `--`. No JS functionality yet.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: frontend HTML shell + full CSS design system"
```

---

### Task 3: Frontend JS — core state, clock, life progress bars, date navigation

**Files:**
- Modify: `public/index.html` (add JS inside `<script>` tag)

- [ ] **Step 1: Add core state and utility functions**

Replace the `<script>` tag contents with:

```javascript
// === STATE ===
let blocks = [];
let completed = new Set();
let chatHistory = [];
let selectedDate = todayStr();
let location = loadLocation();
let lastActiveId = null;
let toastTimer = null;

// === ELEMENTS ===
const $ = (id) => document.getElementById(id);
const liveClock = $("liveClock");
const dayBar = $("dayBar");
const dayBarLabel = $("dayBarLabel");
const weekBar = $("weekBar");
const weekBarLabel = $("weekBarLabel");
const yearBar = $("yearBar");
const yearBarLabel = $("yearBarLabel");
const dateDisplay = $("dateDisplay");
const currentBlockCard = $("currentBlockCard");
const currentTitle = $("currentTitle");
const currentNote = $("currentNote");
const currentTimer = $("currentTimer");
const currentProgress = $("currentProgress");
const currentPills = $("currentPills");
const summaryValue = $("summaryValue");
const summaryLabel = $("summaryLabel");
const progressLabel = $("progressLabel");
const ringFill = $("ringFill");
const weekDots = $("weekDots");
const weekLabel = $("weekLabel");
const timeline = $("timeline");
const emptyState = $("emptyState");
const toast = $("toast");
const chatMessages = $("chatMessages");
const chatInput = $("chatInput");
const cityInput = $("cityInput");
const countryInput = $("countryInput");

// === UTILITIES ===
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function durationLabel(ms) {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timeToDate(dateStr, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3400);
}

function loadLocation() {
  const raw = localStorage.getItem("day-planner-location");
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return { lat: null, lng: null, city: "", country: "" };
}

function saveLocation() {
  localStorage.setItem("day-planner-location", JSON.stringify(location));
}

function loadBlocks() {
  const raw = localStorage.getItem(`day-planner-blocks-${selectedDate}`);
  blocks = raw ? JSON.parse(raw) : [];
}

function saveBlocks() {
  localStorage.setItem(`day-planner-blocks-${selectedDate}`, JSON.stringify(blocks));
}

function loadCompleted() {
  const raw = localStorage.getItem(`day-planner-done-${selectedDate}`);
  completed = new Set(raw ? JSON.parse(raw) : []);
}

function saveCompleted() {
  localStorage.setItem(`day-planner-done-${selectedDate}`, JSON.stringify([...completed]));
}

function shiftDate(offset) {
  const d = new Date(selectedDate + "T12:00:00");
  d.setDate(d.getDate() + offset);
  selectedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  loadBlocks();
  loadCompleted();
  render();
}

// === LIFE PROGRESS BARS ===
function updateLifeBars() {
  const now = new Date();

  // Day: based on schedule window or 6am-11pm default
  let dayStart, dayEnd;
  if (blocks.length > 0) {
    dayStart = timeToDate(selectedDate, blocks[0].start);
    dayEnd = timeToDate(selectedDate, blocks[blocks.length - 1].end);
  } else {
    dayStart = timeToDate(todayStr(), "06:00");
    dayEnd = timeToDate(todayStr(), "23:00");
  }
  const dayPct = Math.max(0, Math.min(100, ((now - dayStart) / (dayEnd - dayStart)) * 100));
  const dayLeft = Math.max(0, dayEnd - now);
  const dayLeftH = Math.floor(dayLeft / 3600000);
  const dayLeftM = Math.floor((dayLeft % 3600000) / 60000);
  dayBar.style.width = `${dayPct}%`;
  dayBarLabel.textContent = `${Math.round(dayPct)}% · ${dayLeftH}h ${dayLeftM}m left`;

  // Week: Mon=0
  const dow = (now.getDay() + 6) % 7; // Mon=0, Sun=6
  const dayFraction = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const weekPct = ((dow + dayFraction) / 7) * 100;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  weekBar.style.width = `${weekPct}%`;
  weekBarLabel.textContent = `${days[dow]} · ${(dow + dayFraction).toFixed(1)}/7`;

  // Year
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now - startOfYear) / 86400000) + 1;
  const isLeap = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0;
  const totalDays = isLeap ? 366 : 365;
  const yearPct = (dayOfYear / totalDays) * 100;
  yearBar.style.width = `${yearPct}%`;
  yearBarLabel.textContent = `${Math.round(yearPct)}% · Day ${dayOfYear}/${totalDays}`;
}

// === CLOCK ===
function updateClock() {
  liveClock.textContent = formatTime(new Date());
}

// === DATE NAV ===
$("prevDay").addEventListener("click", () => shiftDate(-1));
$("nextDay").addEventListener("click", () => shiftDate(1));

// === INIT (continued in next tasks) ===
function render() {
  dateDisplay.textContent = formatDateShort(selectedDate);
  updateLifeBars();
  renderCurrentBlock();
  renderDashboard();
  renderTimeline();
  renderWeekDots();
}

// Placeholder functions (filled in Task 4+5)
function renderCurrentBlock() {}
function renderDashboard() {}
function renderTimeline() {}
function renderWeekDots() {}

// Location init
if (location.city) cityInput.value = location.city;
if (location.country) countryInput.value = location.country;
cityInput.addEventListener("change", () => { location.city = cityInput.value; saveLocation(); });
countryInput.addEventListener("change", () => { location.country = countryInput.value; saveLocation(); });
$("geoBtn").addEventListener("click", () => {
  if (!navigator.geolocation) return showToast("Geolocation not supported");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      location.lat = pos.coords.latitude;
      location.lng = pos.coords.longitude;
      saveLocation();
      showToast(`Location: ${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`);
    },
    () => showToast("Location access denied")
  );
});

// Boot
loadBlocks();
loadCompleted();
render();
updateClock();
setInterval(() => { updateClock(); updateLifeBars(); }, 1000);
```

- [ ] **Step 2: Test in browser**

Run: `node server.js`, open `http://localhost:3000`.
Expected: Clock ticking, life progress bars filling, date navigation works, empty state shown.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: core state, clock, life progress bars, date navigation"
```

---

### Task 4: Frontend JS — timeline, current block, dashboard rendering

**Files:**
- Modify: `public/index.html` (replace placeholder render functions)

- [ ] **Step 1: Replace the placeholder render functions**

Replace the three lines:
```javascript
function renderCurrentBlock() {}
function renderDashboard() {}
function renderTimeline() {}
function renderWeekDots() {}
```

With:

```javascript
function renderCurrentBlock() {
  if (blocks.length === 0) {
    currentBlockCard.style.display = "none";
    return;
  }

  const now = new Date();
  const active = blocks.find(b => {
    const s = timeToDate(selectedDate, b.start);
    const e = timeToDate(selectedDate, b.end);
    return now >= s && now < e;
  });

  if (!active) {
    currentBlockCard.style.display = "none";
    return;
  }

  currentBlockCard.style.display = "";
  currentTitle.textContent = active.title;
  currentNote.textContent = active.note || "";

  const s = timeToDate(selectedDate, active.start);
  const e = timeToDate(selectedDate, active.end);
  currentTimer.textContent = durationLabel(e - now);

  const pct = Math.min(100, ((now - s) / (e - s)) * 100);
  currentProgress.style.width = `${pct}%`;

  currentPills.innerHTML = "";
  const pills = [
    { text: `${active.location}`, cls: "" },
    { text: `${active.priority}`, cls: active.priority === "must" ? "pill-warn" : "" },
    { text: `${active.type}`, cls: active.type === "prayer" ? "pill-good" : "" },
  ];
  pills.forEach(p => {
    const span = document.createElement("span");
    span.className = `pill ${p.cls}`;
    span.textContent = p.text;
    currentPills.appendChild(span);
  });

  // Notification on block transition
  if (lastActiveId !== null && active.id !== lastActiveId) {
    notify("Block changed", active.title);
  }
  lastActiveId = active.id;
}

function renderDashboard() {
  if (blocks.length === 0) {
    summaryValue.textContent = "--";
    summaryLabel.textContent = "no schedule";
    progressLabel.textContent = "0%";
    ringFill.style.strokeDashoffset = "213.6";
    return;
  }

  const total = blocks.length;
  const mustCount = blocks.filter(b => b.priority === "must").length;
  const prayerCount = blocks.filter(b => b.type === "prayer").length;
  const doneCount = blocks.filter(b => completed.has(b.id)).length;

  summaryValue.textContent = `${total}`;
  summaryLabel.textContent = `${mustCount} must · ${prayerCount} prayer`;

  const pct = Math.round((doneCount / total) * 100);
  progressLabel.textContent = `${pct}%`;
  const circumference = 213.6;
  ringFill.style.strokeDashoffset = `${circumference - (circumference * pct) / 100}`;
}

function renderTimeline() {
  if (blocks.length === 0) {
    emptyState.style.display = "";
    timeline.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  timeline.style.display = "";
  timeline.innerHTML = "";

  const now = new Date();

  blocks.forEach(b => {
    const s = timeToDate(selectedDate, b.start);
    const e = timeToDate(selectedDate, b.end);
    const isDone = completed.has(b.id);
    const isCurrent = now >= s && now < e;
    const isMissed = !isDone && !isCurrent && now >= e;

    let stateClass = "";
    if (isDone) stateClass = "done";
    else if (isCurrent) stateClass = "current";
    else if (isMissed) stateClass = "missed";

    const item = document.createElement("div");
    item.className = `tl-item ${stateClass}`;
    item.innerHTML = `
      <div class="tl-time">${b.start} - ${b.end}</div>
      <div>
        <div class="tl-title">${b.title}</div>
        <div class="tl-note">${b.note || ""}</div>
        <div class="tl-meta">${b.location} · ${b.priority} · ${b.type}</div>
      </div>
    `;

    const check = document.createElement("button");
    check.className = `tl-check ${isDone ? "done" : ""}`;
    check.textContent = isDone ? "✓" : "";
    check.title = isDone ? "Mark undone" : "Mark done";
    check.addEventListener("click", () => {
      if (completed.has(b.id)) completed.delete(b.id);
      else completed.add(b.id);
      saveCompleted();
      render();
    });
    item.appendChild(check);
    timeline.appendChild(item);
  });
}

function renderWeekDots() {
  weekDots.innerHTML = "";
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const base = new Date(selectedDate + "T12:00:00");
  const dow = (base.getDay() + 6) % 7;
  const monday = new Date(base);
  monday.setDate(monday.getDate() - dow);

  let plannedCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hasBlocks = localStorage.getItem(`day-planner-blocks-${dStr}`);
    const isToday = dStr === todayStr();
    const isSelected = dStr === selectedDate;

    if (hasBlocks) plannedCount++;

    const dot = document.createElement("div");
    dot.className = `week-dot ${hasBlocks ? "planned" : "empty"} ${isToday ? "today" : ""}`;
    dot.textContent = days[i];
    dot.title = formatDateShort(dStr);
    dot.style.outline = isSelected ? "2px solid var(--focus)" : "";
    dot.addEventListener("click", () => {
      selectedDate = dStr;
      loadBlocks();
      loadCompleted();
      render();
    });
    weekDots.appendChild(dot);
  }
  weekLabel.textContent = `${plannedCount}/7 planned`;
}

// --- Notifications ---
function notify(title, body) {
  showToast(`${title}: ${body}`);
  playTone();
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

function playTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.01;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

$("notifyBtn").addEventListener("click", async () => {
  if (!("Notification" in window)) return showToast("Notifications not supported");
  if (Notification.permission === "granted") return showToast("Already enabled");
  const result = await Notification.requestPermission();
  showToast(result === "granted" ? "Notifications enabled" : "Notifications denied");
});

$("saveBtn").addEventListener("click", () => {
  if (blocks.length === 0) return showToast("No schedule to save");
  saveBlocks();
  saveCompleted();
  showToast("Schedule saved");
});
```

- [ ] **Step 2: Test in browser**

Open `http://localhost:3000`. No schedule yet, so empty state shows. Dashboard shows `--`. Week dots render for current week.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: timeline, current block, dashboard cards, notifications"
```

---

### Task 5: Frontend JS — chat + OpenRouter integration

**Files:**
- Modify: `public/index.html` (add chat logic after existing JS)

- [ ] **Step 1: Add chat + API integration**

Add after the `$("saveBtn")` event listener:

```javascript
// === CHAT ===
async function sendMessage(text) {
  if (!text.trim()) return;
  chatHistory.push({ role: "user", content: text });
  appendChatMsg("user", text);
  chatInput.value = "";
  chatInput.disabled = true;
  $("sendBtn").disabled = true;

  // Show thinking indicator
  const thinkingEl = appendChatMsg("agent", "Thinking...");

  try {
    const payload = {
      messages: chatHistory,
      date: selectedDate,
      lat: location.lat,
      lng: location.lng,
    };

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "No response from agent.";

    chatHistory.push({ role: "assistant", content });

    // Parse schedule from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    let newBlocks = null;
    if (jsonMatch) {
      try {
        newBlocks = JSON.parse(jsonMatch[1]);
        if (Array.isArray(newBlocks) && newBlocks.length > 0) {
          blocks = newBlocks;
          saveBlocks();
          completed.clear();
          saveCompleted();
          render();
        }
      } catch (parseErr) {
        console.error("Failed to parse schedule JSON:", parseErr);
      }
    }

    // Display agent message
    thinkingEl.remove();
    const textPart = content.replace(/```json[\s\S]*?```/, "").trim();
    const msgEl = appendChatMsg("agent", textPart);
    if (newBlocks) {
      const preview = document.createElement("div");
      preview.className = "schedule-preview";
      preview.textContent = `Schedule generated: ${newBlocks.length} blocks`;
      msgEl.appendChild(preview);
    }
  } catch (err) {
    thinkingEl.remove();
    appendChatMsg("agent", `Error: ${err.message}`);
    showToast(`Chat error: ${err.message}`);
  } finally {
    chatInput.disabled = false;
    $("sendBtn").disabled = false;
    chatInput.focus();
  }
}

function appendChatMsg(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

// Send on click or Enter
$("sendBtn").addEventListener("click", () => sendMessage(chatInput.value));
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage(chatInput.value);
  }
});
```

- [ ] **Step 2: Test chat flow**

1. Set your OpenRouter API key in `.env`
2. Restart server: `node server.js`
3. Open `http://localhost:3000`
4. Type: "Tomorrow I need to work on my landing page, have a meeting at 2pm, and go grocery shopping at 5pm"
5. Expected: Agent responds with text + JSON schedule. Timeline renders with blocks. Dashboard updates.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: chat panel + OpenRouter integration + schedule parsing"
```

---

### Task 6: Frontend JS — voice input (Web Speech API)

**Files:**
- Modify: `public/index.html` (add voice logic after chat code)

- [ ] **Step 1: Add voice input**

Add after the chat `keydown` listener:

```javascript
// === VOICE INPUT ===
let recognition = null;
let isListening = false;

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    chatInput.value = transcript;
    stopListening();
  };

  recognition.onerror = () => {
    stopListening();
    showToast("Voice input failed — try again");
  };

  recognition.onend = () => stopListening();
}

function startListening() {
  if (!recognition) return showToast("Voice input not supported in this browser");
  recognition.start();
  isListening = true;
  $("micBtn").classList.add("listening");
}

function stopListening() {
  if (recognition && isListening) recognition.stop();
  isListening = false;
  $("micBtn").classList.remove("listening");
}

$("micBtn").addEventListener("click", () => {
  if (isListening) stopListening();
  else startListening();
});
```

- [ ] **Step 2: Test voice input**

Open `http://localhost:3000`, click the mic button. Speak a sentence. Expected: mic pulses red, transcript appears in input field.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: voice input via Web Speech API"
```

---

### Task 7: Final wiring — auto-refresh timer, prayer time format fix, initial commit

**Files:**
- Modify: `server.js` (fix date format for Aladhan API)
- Modify: `public/index.html` (add 1-second render loop for current block updates)

- [ ] **Step 1: Fix Aladhan date format in server.js**

The Aladhan API expects `DD-MM-YYYY` but we receive `YYYY-MM-DD`. The current code splits on `-` wrong. Replace:

```javascript
  const [day, month, year] = date.split("-"); // YYYY-MM-DD -> DD-MM-YYYY
  const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=2`;
```

With:

```javascript
  const [year, month, day] = date.split("-");
  const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=2`;
```

- [ ] **Step 2: Add auto-refresh to the setInterval in index.html**

Replace:

```javascript
setInterval(() => { updateClock(); updateLifeBars(); }, 1000);
```

With:

```javascript
setInterval(() => { updateClock(); render(); }, 1000);
```

- [ ] **Step 3: Full test**

1. Set `OPENROUTER_API_KEY` in `.env`
2. `node server.js`
3. Open `http://localhost:3000`
4. Click GPS or enter city/country
5. Type: "Tomorrow I need to ship the landing page and attend a team standup at 10am"
6. Verify: schedule renders, progress bars work, current block highlights, checkmarks work, notifications work, voice input works, week dots show planned day

- [ ] **Step 4: Final commit**

```bash
git add server.js public/index.html
git commit -m "fix: Aladhan date format + auto-refresh render loop"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| Express server + OpenRouter proxy | Task 1 |
| Aladhan prayer times API | Task 1 |
| Location: geo + manual + fallback | Task 3 |
| System prompt with prayer anchors | Task 1 |
| CSS design system (glassmorphism) | Task 2 |
| Two-panel layout (chat + schedule) | Task 2 |
| Life progress bars (day/week/year) | Task 3 |
| Current block card + timer | Task 4 |
| Dashboard: summary, progress ring, week dots | Task 4 |
| Timeline with checkmarks + states | Task 4 |
| Chat panel + OpenRouter integration | Task 5 |
| Voice input (Web Speech API) | Task 6 |
| Notifications + audio tone | Task 4 |
| Save to localStorage | Task 3 + 4 |
| Date navigation | Task 3 |
| Aladhan date format fix | Task 7 |
| Auto-refresh render loop | Task 7 |
