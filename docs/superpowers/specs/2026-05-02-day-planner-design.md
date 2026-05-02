# Day Planner — Design Spec

## Overview
Conversational AI schedule builder. Speak/type to an agent, get a fully rendered interactive daily schedule in the browser. Two phases: simple Express app now, T3 migration later.

## Phase 1: Simple (build now)

### Architecture
```
day-planner/
├── day-manager.html          # existing, untouched
├── .impeccable.md            # design system
├── server.js                 # Express: static files + OpenRouter proxy
├── public/
│   └── index.html            # the app (single file: HTML + CSS + JS)
├── package.json              # express, dotenv
├── .env                      # OPENROUTER_API_KEY
├── .gitignore
└── docs/
```

### Dependencies
- `express` — serve files + API proxy
- `dotenv` — load env vars
- That's it.

### Backend: server.js (~100 lines)
- `GET /` — serves `public/index.html`
- `POST /api/chat` — receives `{ messages: [...] }`, forwards to OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`), returns response
- System prompt baked in server-side (user never sees it)
- Model: configurable via env var, default `anthropic/claude-sonnet-4` or `meta-llama/llama-3-70b-instruct` (free on OpenRouter)

### Prayer Times: Aladhan API
- Free, no auth, no key needed
- Endpoint: `GET https://api.aladhan.com/v1/timings/{DD-MM-YYYY}?latitude={lat}&longitude={lng}&method=2`
- Alternative: `GET https://api.aladhan.com/v1/timingsByCity?city={city}&country={country}&method=2&date_or_timestamp={DD-MM-YYYY}`
- Returns: Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha times
- Cached in memory per date (one call per date per session)

#### Location resolution (priority order):
1. **Browser geolocation** — `navigator.geolocation.getCurrentPosition()` → sends lat/lng to server → Aladhan timings endpoint
2. **Manual input** — city/country fields in a small config bar (persisted to localStorage: `day-planner-location`)
3. **Fallback** — hardcoded defaults (Houston, US) if both fail

#### Flow:
1. Frontend gets location (geo or manual) → sends with chat request
2. Server fetches Aladhan for that date+location (cached per date)
3. Prayer times injected into system prompt as immovable anchor points
4. Agent schedules everything else around them

### System Prompt (for the schedule agent)
Tells the LLM:
- You are a daily schedule planning agent
- User describes their day in natural language
- Prayer times for this date/location are provided (from Aladhan API): "Fajr: 04:47, Dhuhr: 13:15, Asr: 16:52, Maghrib: 20:05, Isha: 21:30"
- These are IMMOVABLE anchor blocks. Schedule everything else around them.
- Return a conversational response followed by a JSON code block
- JSON must be an array matching schema: `{id, start, end, title, note, location, priority, type}`
- `location`: "desk" | "away"
- `priority`: "must" | "should" | "stretch"
- `type`: "prayer" | "routine" | "build" | "company" | "personal" | "logistics" | "recovery" | "review" | "spiritual" | "execution" | "admin" | "r&d" | "visibility"
- Blocks must not overlap, must cover wake-to-sleep window
- Include wake block at start, shutdown review at end

### Frontend: public/index.html (single file)

#### Layout — two-panel split
```
┌─────────────────────────────────────────────────┐
│  Day Planner                    [date] [clock]  │
├──────────────────┬──────────────────────────────┤
│                  │  Life Progress Bars           │
│   Chat Panel     │  [Day ████████░░░░ 65%]      │
│                  │  [Week ███░░░░░░░░ 43%]      │
│  [mic] [input]   │  [Year ██░░░░░░░░░ 34%]     │
│                  ├──────────────────────────────┤
│  Agent says:     │  Current Block               │
│  "Here's your    │  ┌─────────────────────┐     │
│   schedule..."   │  │ Fajr salah  04:35   │     │
│                  │  │ ████████░░ 12:34    │     │
│                  │  └─────────────────────┘     │
│                  ├──────────────────────────────┤
│                  │  Dashboard Cards              │
│                  │  [Summary] [Progress] [Week]  │
│                  ├──────────────────────────────┤
│                  │  Timeline                     │
│                  │  04:30 Wake .............. ✓  │
│                  │  04:35 Fajr .............. ●  │
│                  │  04:50 Quran ............. ○  │
│                  │  ...                          │
│                  ├──────────────────────────────┤
│                  │  [Save] [Notifications] [←→] │
└──────────────────┴──────────────────────────────┘
```

#### Chat Panel (left, ~35% width)
- Message history (scrollable)
- Input field at bottom + send button
- Mic button: Web Speech API (`webkitSpeechRecognition`) for voice input
- Agent messages show text + parsed schedule
- User can refine: "move dentist to 11", "add gym at 6am", "remove the admin block"
- Conversation stored in memory (not persisted — fresh each session)

#### Life Progress Bars (top of right panel)
- **Day bar**: `(now - scheduleStart) / (scheduleEnd - scheduleStart)` — label: "Day: 65% · 6h 12m left"
- **Week bar**: `(dayOfWeek + dayFraction) / 7` — label: "Week: Thu · 3.6/7"
- **Year bar**: `dayOfYear / (isLeapYear ? 366 : 365)` — label: "Year: 34% · Day 122"
- Gradient fill: blue (#5f9bff) → green (#61e0b3)
- Height: 8px each, 999px radius, stacked with 6px gap

#### Current Block Card
- Shows active block title, countdown timer, location pill, priority pill
- Next block hint
- Progress bar for current block elapsed
- Same logic as existing day-manager.html

#### Dashboard Cards (3 cards in a row)
1. **Day Summary** — total blocks, must count, focus hours, prayer count
2. **Progress Ring** — SVG donut chart, % blocks completed, animated fill
3. **Week Glance** — 7 dots for Mon-Sun, colored by status (green=planned, gray=empty, gold=today), clickable to load that day

#### Timeline
- Vertical list of all blocks for the day
- Each block: time range | title + note | checkmark button
- State classes: current (green border), done (faded + check), missed (red border), upcoming (default)
- Click checkmark to toggle done
- Blocks saved to localStorage per date: `day-planner-blocks-YYYY-MM-DD`
- Checkmarks saved to localStorage: `day-planner-done-YYYY-MM-DD`

#### Controls Bar (bottom)
- Save schedule button (stores to localStorage)
- Enable notifications checkbox
- Date navigation arrows (prev/next day)
- Date display

#### Notifications
- Browser Notification API
- Fires when block transitions (same as existing day-manager.html pattern)
- Audio tone via AudioContext

#### Voice Input
- `webkitSpeechRecognition` / `SpeechRecognition`
- Mic button toggles listening
- Transcribed text goes into chat input
- Visual indicator when listening (pulsing ring on mic button)

### Data Flow
```
User speaks/types
  → POST /api/chat { messages }
  → server.js adds system prompt, calls OpenRouter
  → OpenRouter returns text + JSON schedule
  → Frontend parses JSON from response
  → Renders timeline + dashboards
  → User clicks Save → localStorage
  → Timers + notifications run from saved blocks
```

### localStorage Keys
- `day-planner-blocks-YYYY-MM-DD` — JSON array of blocks for that date
- `day-planner-done-YYYY-MM-DD` — JSON array of completed block IDs
- `day-planner-chat-history` — not persisted (session only)

---

## Phase 2: T3 Migration (learn later)

### What T3 gives us
- **Next.js** — file-based routing, SSR, API routes
- **TypeScript** — type safety end-to-end
- **tRPC** — typed API calls (replace raw fetch to /api/chat)
- **Prisma/Drizzle** — database ORM (replace localStorage with real DB)
- **Tailwind** — utility CSS (replace hand-written CSS)
- **NextAuth** — auth if multi-user later

### Migration path
1. `npx create-t3-app@latest` with Tailwind + tRPC (skip Prisma/auth initially)
2. Move chat API to tRPC router (`src/server/api/routers/chat.ts`)
3. Move UI to Next.js page (`src/app/page.tsx`)
4. Convert CSS to Tailwind classes using design tokens from .impeccable.md
5. Add Prisma later when ready for persistent DB
6. Add auth later if multi-user needed

### T3 Quickstart Reference
```bash
# Install
npm create t3-app@latest

# Options to pick:
# - TypeScript: yes
# - Tailwind: yes
# - tRPC: yes
# - Prisma/Drizzle: skip for now
# - NextAuth: skip for now
# - App Router: yes

# Project structure:
# src/app/page.tsx          — main page
# src/app/api/trpc/         — tRPC handler
# src/server/api/root.ts    — merged routers
# src/server/api/routers/   — your API logic
# src/trpc/react.tsx        — client-side hooks
```

### Key T3 Concepts to Learn
1. **tRPC**: define procedures on server → call them on client with full type safety, no API schema needed
2. **App Router**: each folder in `src/app/` = a route, `page.tsx` = the page component
3. **Server Components**: components that run on server by default (fetch data without useEffect)
4. **Tailwind**: utility classes instead of writing CSS (`bg-blue-500 p-4 rounded-xl`)

---

## Style Guide
All UI follows `.impeccable.md` design system. Dark glassmorphism, Inter font, gradient accents, 12-18px radius, glass panels with blur.

## Success Criteria
1. `node server.js` → open localhost:3000 → working app
2. Type/speak a day description → get rendered interactive schedule
3. Progress bars show day/week/year elapsed
4. Dashboard cards show summary, progress ring, week glance
5. Timeline blocks are interactive (checkmarks, states)
6. Browser notifications work
7. Schedule saves to localStorage per date
8. All in ~3 files (server.js, index.html, package.json)
