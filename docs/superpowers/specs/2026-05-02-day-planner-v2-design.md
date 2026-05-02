# Day Planner V2 — T3 Stack Design Spec

## Overview
Upgrade from vanilla HTML to T3 stack (Next.js + tRPC + Prisma + Tailwind). Smart conversational agent that suggests, asks, and learns. Interactive schedule blocks with drag-and-drop. Thesys C1 for generative UI in chat with plain-text fallback. SQLite DB for persistence and pattern learning.

## Stack
- Next.js 14 (App Router)
- tRPC (typed API)
- Prisma + SQLite (Postgres-ready schema)
- Tailwind CSS + shadcn/ui
- dnd-kit (drag-and-drop)
- Thesys C1 + @thesysai/genui-sdk (chat UI, with fallback)
- OpenRouter (LLM)
- Aladhan API (prayer times)
- Web Speech API (voice)

## Project Structure
```
app/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # main dashboard
│   │   ├── layout.tsx                  # root layout + providers
│   │   └── api/
│   │       ├── chat/route.ts           # OpenRouter + Thesys proxy
│   │       └── trpc/[trpc]/route.ts    # tRPC handler
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx           # chat container
│   │   │   ├── ThesysChat.tsx          # Thesys C1 wrapper
│   │   │   ├── PlainChat.tsx           # fallback text chat
│   │   │   └── VoiceInput.tsx          # mic button + speech
│   │   ├── schedule/
│   │   │   ├── BlockCard.tsx           # single block (draggable, editable)
│   │   │   ├── BlockList.tsx           # sortable block list (dnd-kit)
│   │   │   ├── PrayerBlock.tsx         # prayer-specific block (immovable)
│   │   │   └── HeroBlocks.tsx          # NOW + NEXT cards
│   │   ├── dashboard/
│   │   │   ├── LifeCards.tsx           # day/week/year progress
│   │   │   ├── FocusWidget.tsx         # focus hours
│   │   │   ├── ProgressRing.tsx        # SVG donut
│   │   │   ├── WeekGlance.tsx          # 7-dot week view
│   │   │   ├── TypeChart.tsx           # block type breakdown
│   │   │   └── PatternInsights.tsx     # learned patterns
│   │   └── ui/                         # shadcn components
│   ├── server/
│   │   ├── db.ts                       # Prisma client
│   │   └── api/
│   │       ├── root.ts                 # merged tRPC router
│   │       ├── trpc.ts                 # tRPC context + procedures
│   │       └── routers/
│   │           ├── schedule.ts         # CRUD for schedules + blocks
│   │           ├── patterns.ts         # pattern log queries
│   │           └── prayer.ts           # Aladhan API proxy + cache
│   ├── lib/
│   │   ├── types.ts                    # shared types
│   │   ├── constants.ts                # type colors, defaults
│   │   ├── agent-prompt.ts             # system prompt builder
│   │   └── utils.ts                    # time helpers
│   └── trpc/
│       ├── react.tsx                   # client-side tRPC
│       └── server.ts                   # server-side tRPC
├── prisma/
│   └── schema.prisma
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

## Database Schema

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Schedule {
  id        String   @id @default(cuid())
  date      String   @unique
  title     String   @default("")
  note      String   @default("")
  blocks    Block[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Block {
  id         String   @id @default(cuid())
  scheduleId String
  schedule   Schedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  blockId    String
  start      String
  end        String
  title      String
  note       String   @default("")
  location   String
  priority   String
  type       String
  sortOrder  Int
  completed  Boolean  @default(false)

  @@index([scheduleId])
}

model PatternLog {
  id        String   @id @default(cuid())
  date      String
  blockType String
  action    String
  context   String   @default("")
  createdAt DateTime @default(now())

  @@index([blockType])
  @@index([date])
}
```

## tRPC Routers

### schedule router
- `getByDate(date: string)` — returns schedule + blocks for a date, null if none
- `upsert(date, title, note, blocks[])` — creates or updates schedule + blocks (deletes old blocks, inserts new)
- `toggleBlock(blockId: string)` — toggles completed, logs to PatternLog
- `deleteBlock(blockId: string)` — removes block, logs to PatternLog
- `updateBlock(blockId, fields)` — inline edit any field
- `reorderBlocks(scheduleId, blockIds[])` — updates sortOrder for all blocks

### patterns router
- `getInsights()` — queries PatternLog for: most skipped block types, completion rates by type, average blocks per day, streak data
- `getHistory(days: number)` — last N days of schedules with completion stats

### prayer router
- `getTimes(date, lat, lng)` — fetches from Aladhan, caches in memory

## Agent System Prompt

Built dynamically with:
1. Base instructions (schedule schema, rules)
2. Prayer times for date+location (from Aladhan)
3. Pattern insights from DB ("You complete 90% of prayer blocks but skip admin 60% of the time")
4. Current schedule if editing ("Here's the current schedule, user wants to modify it")
5. Instructions to ask follow-up questions when input is vague
6. Instructions to suggest optimizations based on patterns

## Chat API Route (app/src/app/api/chat/route.ts)

Two modes:
1. **Thesys mode** (THESYS_API_KEY set): proxies to `https://api.thesys.dev/v1/embed` with C1 model. Returns generative UI components.
2. **Plain mode** (no key or Thesys fails): proxies to OpenRouter. Returns text + JSON. Frontend parses JSON manually.

Automatic fallback: try Thesys first, catch errors, retry with OpenRouter.

## Interactive Block Cards

### BlockCard.tsx
- shadcn Card component
- Drag handle (grip icon) on left — dnd-kit `useSortable`
- Title: inline-editable `<input>` on click
- Time: inline-editable, validates HH:MM format
- Note: expandable on click, editable textarea
- Type/Priority/Location: dropdown selectors on click
- Checkmark button: toggles completion via tRPC mutation
- Delete button: removes block via tRPC mutation
- Active block: animated gradient border, prominent

### PrayerBlock.tsx
- Extends BlockCard but: NOT draggable, green left border, crescent icon, "ANCHOR" badge
- Time not editable (comes from Aladhan)
- Can still be checked as completed

### BlockList.tsx
- dnd-kit `SortableContext` wrapping all blocks
- `DndContext` with collision detection
- On drag end: calls `reorderBlocks` mutation
- Prayer blocks stay in position (not sortable)

## Dashboard Widgets

All use shadcn Card + Tailwind. Same design as V1 but React components.

### LifeCards.tsx
- 3 cards: Day/Week/Year
- Big gradient percentage number
- Progress bar
- Hover to expand: extra stats
- Uses `useEffect` + `setInterval` for live updates

### HeroBlocks.tsx
- NOW card: active block title, big countdown timer, progress bar, pills
- NEXT card: upcoming block, "starts in" countdown
- Both update every second

### PatternInsights.tsx (new)
- Queries `patterns.getInsights` via tRPC
- Shows: "Prayer: 95% completion", "Admin: 40% — consider removing?"
- Small colored bars per type

## Notifications
- Same as V1: Notification API + AudioContext tone
- Managed in a `useNotifications` hook
- Fires on block transitions (checked via setInterval)

## Voice Input
- Same as V1: `webkitSpeechRecognition`
- Wrapped in `VoiceInput.tsx` component
- Mic button with pulse animation when listening

## Styling
- Tailwind config extends with design tokens from `.impeccable.md`
- Dark mode only (no light mode toggle)
- shadcn/ui with custom dark theme
- Glassmorphism: `bg-white/5 backdrop-blur-lg border border-white/10`
- Gradient accents on active elements

## Success Criteria
1. `cd app && pnpm dev` → working dashboard at localhost:3000
2. Chat with agent → interactive schedule generated
3. Drag blocks to reorder (except prayer blocks)
4. Click to inline-edit any block field
5. Pattern insights show after 2+ days of data
6. Thesys C1 renders rich UI in chat; falls back to text gracefully
7. All data persists in SQLite via Prisma
8. V1 still works independently (`node server.js`)
