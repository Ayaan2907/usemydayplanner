# Day Planner

Conversational AI schedule builder with prayer-anchored time blocks. Speak to an agent, get a fully interactive daily schedule.

## What it does

- **Talk to build your day** — describe what you need to do, the agent builds a schedule around your prayer times
- **Prayer anchors** — Fajr, Dhuhr, Asr, Maghrib, Isha are immovable blocks (times from Aladhan API by location)
- **Interactive blocks** — drag to reorder, click to edit, check to complete
- **Smart agent** — suggests optimizations, remembers your patterns, asks follow-ups
- **Life progress bars** — day/week/year elapsed with hover stats
- **Dashboard widgets** — focus hours, progress ring, type chart, week glance, pattern insights
- **Voice input** — speak your schedule via Web Speech API
- **Notifications** — browser notifications + audio tone on block transitions

## Architecture

Two versions coexist:

### V1: Simple (works now)
```bash
node server.js
# → http://localhost:3000
```
Single HTML file + Express server. OpenRouter proxy + Aladhan prayer times. Zero dependencies beyond express/dotenv.

### V2: T3 Stack (in development)
```bash
cd app
pnpm install
pnpm dev
# → http://localhost:3000
```
Next.js + tRPC + Prisma (SQLite) + Tailwind + shadcn/ui + dnd-kit + Thesys C1.

## Setup

### API Keys

```bash
cp .env.example .env
```

Required:
- `OPENROUTER_API_KEY` — get from [openrouter.ai](https://openrouter.ai)

Optional:
- `THESYS_API_KEY` — get from [console.thesys.dev](https://console.thesys.dev/keys) (falls back to plain chat without it)

### V1 Quick Start

```bash
pnpm install
pnpm start
```

### V2 Quick Start

```bash
cd app
pnpm install
npx prisma db push
pnpm dev
```

## Tech Stack

| Layer | V1 | V2 |
|-------|----|----|
| Frontend | Vanilla HTML/CSS/JS | Next.js + React + Tailwind + shadcn/ui |
| API | Express + fetch | tRPC |
| Database | localStorage | Prisma + SQLite |
| LLM | OpenRouter | OpenRouter |
| Chat UI | Plain text | Thesys C1 (with fallback) |
| Blocks | Static HTML | dnd-kit draggable cards |
| Prayer times | Aladhan API | Aladhan API |
| Voice | Web Speech API | Web Speech API |

## Project Structure

```
day-planner/
├── server.js              # V1 Express server
├── public/index.html       # V1 frontend (standalone)
├── day-manager.html        # Original prototype
├── .impeccable.md          # Design system
├── app/                    # V2 T3 Next.js app
│   ├── src/app/            # Pages + API routes
│   ├── src/components/     # React components
│   ├── src/server/         # tRPC routers + DB
│   └── prisma/             # Schema + migrations
└── docs/                   # Specs + plans
```

## Design Principles

1. **Clarity over decoration** — every element earns its space
2. **Urgency without anxiety** — time pressure is empowering, not stressful
3. **Spiritual anchoring** — prayer blocks are first-class citizens
4. **Ship over polish** — working today beats perfect next week
5. **One-glance comprehension** — dashboard state readable in 3 seconds

## License

Private
