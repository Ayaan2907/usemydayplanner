# T3 Phase 1: Scaffold + DB + Routers + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a T3 Next.js app with Prisma/SQLite database, tRPC routers for schedule CRUD and prayer times, and a working dashboard page that renders schedules from the database — the foundation for all V2 features.

**Architecture:** `create-t3-app` scaffolds the Next.js project in `app/` subdirectory. Prisma manages SQLite. tRPC routers expose schedule CRUD, prayer times, and pattern queries. A single `page.tsx` renders the dashboard using the same dual-theme design system from V1. Data seeds from DEFAULT_BLOCKS on first load.

**Tech Stack:** Next.js 14 (App Router), tRPC, Prisma + SQLite, Tailwind CSS, shadcn/ui

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `app/` | Create | T3 project root (scaffolded by create-t3-app) |
| `app/prisma/schema.prisma` | Modify | Add Schedule, Block, PatternLog models |
| `app/src/server/db.ts` | Exists | Prisma client (from scaffold) |
| `app/src/server/api/trpc.ts` | Exists | tRPC context (from scaffold) |
| `app/src/server/api/root.ts` | Modify | Register schedule, prayer, patterns routers |
| `app/src/server/api/routers/schedule.ts` | Create | Schedule + Block CRUD |
| `app/src/server/api/routers/prayer.ts` | Create | Aladhan API proxy |
| `app/src/server/api/routers/patterns.ts` | Create | Pattern log queries |
| `app/src/lib/types.ts` | Create | Shared types |
| `app/src/lib/constants.ts` | Create | Type colors, default blocks |
| `app/src/lib/utils.ts` | Create | Time helpers |
| `app/src/app/page.tsx` | Modify | Main dashboard page |
| `app/src/app/layout.tsx` | Modify | Dark theme, font setup |
| `app/src/app/globals.css` | Modify | Dual theme CSS tokens |
| `app/.env` | Create | DATABASE_URL + API keys |

---

### Task 1: Scaffold T3 app

**Files:**
- Create: `app/` (entire directory via create-t3-app)

- [ ] **Step 1: Run create-t3-app**

```bash
cd /Users/ayaan/Developer/day-planner
pnpm create t3-app@latest app --tailwind --trpc --prisma --appRouter --CI --dbProvider sqlite
```

Expected: `app/` directory created with Next.js + tRPC + Prisma + Tailwind.

- [ ] **Step 2: Install dependencies**

```bash
cd app && pnpm install
```

- [ ] **Step 3: Verify scaffold works**

```bash
cd /Users/ayaan/Developer/day-planner/app && pnpm dev &
sleep 5 && curl -s http://localhost:3000 | head -5
kill %1
```

Expected: HTML response from Next.js dev server.

- [ ] **Step 4: Commit**

```bash
cd /Users/ayaan/Developer/day-planner
git add app/
git commit -m "feat: scaffold T3 app (Next.js + tRPC + Prisma + Tailwind)"
```

---

### Task 2: Prisma schema + database

**Files:**
- Modify: `app/prisma/schema.prisma`
- Create: `app/.env`

- [ ] **Step 1: Write the Prisma schema**

Replace contents of `app/prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
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

- [ ] **Step 2: Set DATABASE_URL in app/.env**

Ensure `app/.env` contains:

```
DATABASE_URL="file:./dev.db"
OPENROUTER_API_KEY="your-key-here"
OPENROUTER_MODEL="meta-llama/llama-3.3-70b-instruct"
```

- [ ] **Step 3: Push schema to database**

```bash
cd /Users/ayaan/Developer/day-planner/app && npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Generate Prisma client**

```bash
cd /Users/ayaan/Developer/day-planner/app && npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 5: Commit**

```bash
cd /Users/ayaan/Developer/day-planner
git add app/prisma/schema.prisma
git commit -m "feat: Prisma schema — Schedule, Block, PatternLog models"
```

---

### Task 3: Shared types, constants, utilities

**Files:**
- Create: `app/src/lib/types.ts`
- Create: `app/src/lib/constants.ts`
- Create: `app/src/lib/utils.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export interface BlockInput {
  blockId: string;
  start: string;    // HH:MM
  end: string;      // HH:MM
  title: string;
  note?: string;
  location: "desk" | "away";
  priority: "must" | "should" | "stretch";
  type: string;
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}
```

- [ ] **Step 2: Create constants.ts**

```typescript
export const TYPE_COLORS: Record<string, string> = {
  prayer: "#34d399",
  routine: "#6b8afd",
  spiritual: "#a78bfa",
  execution: "#fbbf24",
  personal: "#fb923c",
  build: "#38bdf8",
  company: "#f87171",
  logistics: "#94a3b8",
  recovery: "#4ade80",
  admin: "#d4a054",
  "r&d": "#c084fc",
  review: "#2dd4bf",
  product: "#60a5fa",
  visibility: "#fb923c",
};

export const DEFAULT_BLOCKS = [
  { blockId: "wake", start: "04:30", end: "04:35", title: "Wake, wudu, and stand up immediately", note: "No snooze. Drink water and move within 60 seconds.", location: "away" as const, priority: "must" as const, type: "routine" },
  { blockId: "fajr", start: "04:35", end: "04:50", title: "Fajr salah", note: "Anchor your day spiritually before work starts.", location: "away" as const, priority: "must" as const, type: "prayer" },
  { blockId: "quran", start: "04:50", end: "05:20", title: "Quran recitation (30 min)", note: "Keep it calm and consistent.", location: "away" as const, priority: "must" as const, type: "spiritual" },
  { blockId: "shutdown", start: "21:50", end: "22:10", title: "Shutdown review + tomorrow prep", note: "Log what shipped, blockers, and first task for next day.", location: "desk" as const, priority: "must" as const, type: "review" },
];
```

- [ ] **Step 3: Create utils.ts**

```typescript
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function durationLabel(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function timeToDate(dateStr: string, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(h!, m!, 0, 0);
  return d;
}

export function blockMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh! * 60 + em!) - (sh! * 60 + sm!);
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/ayaan/Developer/day-planner
git add app/src/lib/
git commit -m "feat: shared types, constants, and utility functions"
```

---

### Task 4: tRPC routers — schedule, prayer, patterns

**Files:**
- Create: `app/src/server/api/routers/schedule.ts`
- Create: `app/src/server/api/routers/prayer.ts`
- Create: `app/src/server/api/routers/patterns.ts`
- Modify: `app/src/server/api/root.ts`

- [ ] **Step 1: Create schedule router**

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

const blockSchema = z.object({
  blockId: z.string(),
  start: z.string(),
  end: z.string(),
  title: z.string(),
  note: z.string().optional().default(""),
  location: z.string(),
  priority: z.string(),
  type: z.string(),
});

export const scheduleRouter = createTRPCRouter({
  getByDate: publicProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.schedule.findUnique({
        where: { date: input.date },
        include: { blocks: { orderBy: { sortOrder: "asc" } } },
      });
    }),

  upsert: publicProcedure
    .input(z.object({
      date: z.string(),
      title: z.string().optional().default(""),
      note: z.string().optional().default(""),
      blocks: z.array(blockSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.schedule.findUnique({ where: { date: input.date } });

      if (existing) {
        await ctx.db.block.deleteMany({ where: { scheduleId: existing.id } });
        return ctx.db.schedule.update({
          where: { id: existing.id },
          data: {
            title: input.title,
            note: input.note,
            blocks: {
              create: input.blocks.map((b, i) => ({ ...b, sortOrder: i })),
            },
          },
          include: { blocks: { orderBy: { sortOrder: "asc" } } },
        });
      }

      return ctx.db.schedule.create({
        data: {
          date: input.date,
          title: input.title,
          note: input.note,
          blocks: {
            create: input.blocks.map((b, i) => ({ ...b, sortOrder: i })),
          },
        },
        include: { blocks: { orderBy: { sortOrder: "asc" } } },
      });
    }),

  toggleBlock: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const block = await ctx.db.block.findUniqueOrThrow({ where: { id: input.id } });
      const updated = await ctx.db.block.update({
        where: { id: input.id },
        data: { completed: !block.completed },
      });

      await ctx.db.patternLog.create({
        data: {
          date: new Date().toISOString().split("T")[0]!,
          blockType: block.type,
          action: updated.completed ? "completed" : "uncompleted",
          context: block.title,
        },
      });

      return updated;
    }),

  updateBlock: publicProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      note: z.string().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
      location: z.string().optional(),
      priority: z.string().optional(),
      type: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.block.update({ where: { id }, data });
    }),

  deleteBlock: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const block = await ctx.db.block.findUniqueOrThrow({ where: { id: input.id } });
      await ctx.db.patternLog.create({
        data: {
          date: new Date().toISOString().split("T")[0]!,
          blockType: block.type,
          action: "removed",
          context: block.title,
        },
      });
      return ctx.db.block.delete({ where: { id: input.id } });
    }),

  reorderBlocks: publicProcedure
    .input(z.object({
      scheduleId: z.string(),
      blockIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.blockIds.map((id, i) =>
          ctx.db.block.update({ where: { id }, data: { sortOrder: i } })
        )
      );
      return { success: true };
    }),

  updateMeta: publicProcedure
    .input(z.object({
      date: z.string(),
      title: z.string().optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { date, ...data } = input;
      return ctx.db.schedule.upsert({
        where: { date },
        update: data,
        create: { date, ...data },
      });
    }),
});
```

- [ ] **Step 2: Create prayer router**

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import type { PrayerTimes } from "~/lib/types";

const cache = new Map<string, PrayerTimes>();

export const prayerRouter = createTRPCRouter({
  getTimes: publicProcedure
    .input(z.object({
      date: z.string(),
      lat: z.number(),
      lng: z.number(),
    }))
    .query(async ({ input }) => {
      const key = `${input.date}_${input.lat}_${input.lng}`;
      if (cache.has(key)) return cache.get(key)!;

      const [year, month, day] = input.date.split("-");
      const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${input.lat}&longitude=${input.lng}&method=2`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Aladhan API error: ${res.status}`);

      const data = (await res.json()) as { data: { timings: Record<string, string> } };
      const t = data.data.timings;
      const times: PrayerTimes = {
        Fajr: t.Fajr!,
        Sunrise: t.Sunrise!,
        Dhuhr: t.Dhuhr!,
        Asr: t.Asr!,
        Maghrib: t.Maghrib!,
        Isha: t.Isha!,
      };

      cache.set(key, times);
      return times;
    }),
});
```

- [ ] **Step 3: Create patterns router**

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const patternsRouter = createTRPCRouter({
  getInsights: publicProcedure.query(async ({ ctx }) => {
    const logs = await ctx.db.patternLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const byType: Record<string, { completed: number; total: number }> = {};
    for (const log of logs) {
      if (!byType[log.blockType]) byType[log.blockType] = { completed: 0, total: 0 };
      byType[log.blockType]!.total++;
      if (log.action === "completed") byType[log.blockType]!.completed++;
    }

    const insights = Object.entries(byType).map(([type, stats]) => ({
      type,
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      total: stats.total,
    }));

    return insights.sort((a, b) => b.total - a.total);
  }),

  getHistory: publicProcedure
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);
      const sinceStr = since.toISOString().split("T")[0]!;

      return ctx.db.schedule.findMany({
        where: { date: { gte: sinceStr } },
        include: { blocks: true },
        orderBy: { date: "desc" },
      });
    }),
});
```

- [ ] **Step 4: Register routers in root.ts**

Replace `app/src/server/api/root.ts` contents with:

```typescript
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { scheduleRouter } from "./routers/schedule";
import { prayerRouter } from "./routers/prayer";
import { patternsRouter } from "./routers/patterns";

export const appRouter = createTRPCRouter({
  schedule: scheduleRouter,
  prayer: prayerRouter,
  patterns: patternsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
```

- [ ] **Step 5: Verify tRPC compiles**

```bash
cd /Users/ayaan/Developer/day-planner/app && npx tsc --noEmit
```

Expected: No errors (or only pre-existing scaffold warnings).

- [ ] **Step 6: Commit**

```bash
cd /Users/ayaan/Developer/day-planner
git add app/src/server/api/
git commit -m "feat: tRPC routers — schedule CRUD, prayer times, pattern insights"
```

---

### Task 5: Dual-theme CSS + layout setup

**Files:**
- Modify: `app/src/app/globals.css`
- Modify: `app/src/app/layout.tsx`

- [ ] **Step 1: Write globals.css with dual theme tokens**

Replace `app/src/app/globals.css` with the theme tokens from the UI reinvention spec. Include the same CSS custom properties from `public/index.html`'s `<style>` block (the `[data-theme="dark"]`, `[data-theme="light"]`, and `:root` sections), plus Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sans: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-pill: 9999px;
  --ease-fast: 120ms ease;
  --ease-normal: 200ms ease;
  --ease-slow: 300ms ease;
}

[data-theme="dark"] {
  --bg: #0c0f1a;
  --surface-1: #141825;
  --surface-2: #1c2033;
  --surface-3: #252a3f;
  --text: #e8ecf4;
  --text-muted: #8891a8;
  --border: #2a3048;
  --border-hover: #3d4463;
  --accent: #3b82f6;
  --accent-soft: rgba(59, 130, 246, 0.12);
  --good: #34d399;
  --good-soft: rgba(52, 211, 153, 0.12);
  --warn: #fbbf24;
  --warn-soft: rgba(251, 191, 36, 0.12);
  --danger: #f87171;
  --danger-soft: rgba(248, 113, 113, 0.12);
  --shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
  --input-bg: #0f1220;
}

[data-theme="light"] {
  --bg: #fdfdf8;
  --surface-1: #f5f5f0;
  --surface-2: #eeefe9;
  --surface-3: #e5e7e0;
  --text: #23251d;
  --text-muted: #65675e;
  --border: #bfc1b7;
  --border-hover: #a0a298;
  --accent: #F54E00;
  --accent-soft: rgba(245, 78, 0, 0.08);
  --good: #16a34a;
  --good-soft: rgba(22, 163, 74, 0.08);
  --warn: #d97706;
  --warn-soft: rgba(217, 119, 6, 0.08);
  --danger: #dc2626;
  --danger-soft: rgba(220, 38, 38, 0.08);
  --shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  --input-bg: #eeefe9;
}

body {
  font-family: var(--font-sans);
  color: var(--text);
  background: var(--bg);
}
```

- [ ] **Step 2: Update layout.tsx**

Replace `app/src/app/layout.tsx` with:

```tsx
import "~/app/globals.css";
import type { Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Day Planner",
  description: "Conversational AI schedule builder with prayer-anchored time blocks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ayaan/Developer/day-planner
git add app/src/app/globals.css app/src/app/layout.tsx
git commit -m "feat: dual-theme CSS tokens + layout setup"
```

---

### Task 6: Dashboard page — minimal working version

**Files:**
- Modify: `app/src/app/page.tsx`

- [ ] **Step 1: Write page.tsx with schedule display**

Replace `app/src/app/page.tsx` with a minimal dashboard that fetches schedule from DB via tRPC and renders it. This is a client component that uses the same render patterns as V1:

```tsx
"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { todayStr, formatDateShort, durationLabel, timeToDate, blockMinutes } from "~/lib/utils";
import { TYPE_COLORS } from "~/lib/constants";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [theme, setTheme] = useState("dark");

  const { data: schedule, refetch } = api.schedule.getByDate.useQuery({ date: selectedDate });
  const toggleMutation = api.schedule.toggleBlock.useMutation({ onSuccess: () => refetch() });
  const metaMutation = api.schedule.updateMeta.useMutation();

  const blocks = schedule?.blocks ?? [];
  const completed = new Set(blocks.filter(b => b.completed).map(b => b.id));

  useEffect(() => {
    const saved = localStorage.getItem("day-planner-theme") ?? "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("day-planner-theme", next);
  }

  function shiftDate(offset: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  const now = new Date();
  const active = blocks.find(b => {
    const s = timeToDate(selectedDate, b.start);
    const e = timeToDate(selectedDate, b.end);
    return now >= s && now < e;
  });
  const nextBlock = blocks.find(b => now < timeToDate(selectedDate, b.start));

  const doneCount = blocks.filter(b => b.completed).length;
  const deskMins = blocks.filter(b => b.location === "desk").reduce((sum, b) => sum + blockMinutes(b.start, b.end), 0);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "60px 16px 72px" }}>
      {/* Header */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 48,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 16px", background: "var(--bg)", borderBottom: "1px solid var(--border)", zIndex: 40,
      }}>
        <h1 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Day Planner</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={toggleTheme} style={{
            background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)",
            borderRadius: 4, padding: "5px 10px", cursor: "pointer", fontSize: "0.85rem",
          }}>
            {theme === "dark" ? "\u2600" : "\u263D"}
          </button>
          <Clock />
        </div>
      </header>

      {/* Day Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div>
          <input
            defaultValue={schedule?.title ?? ""}
            placeholder="Name this day..."
            onBlur={(e) => metaMutation.mutate({ date: selectedDate, title: e.target.value })}
            style={{
              width: "100%", fontSize: "1.2rem", fontWeight: 700, color: "var(--text)",
              background: "transparent", border: "none", borderBottom: "2px solid transparent",
              padding: "2px 0", outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => shiftDate(-1)} style={navBtnStyle}>&larr;</button>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{formatDateShort(selectedDate)}</span>
          <button onClick={() => shiftDate(1)} style={navBtnStyle}>&rarr;</button>
        </div>
      </div>

      {/* NOW + NEXT */}
      {(active || nextBlock) && (
        <div style={{ display: "grid", gridTemplateColumns: active && nextBlock ? "1.6fr 1fr" : "1fr", gap: 8, marginBottom: 12 }}>
          {active && (
            <div style={{ ...cardStyle, borderLeft: "3px solid var(--good)", background: "var(--good-soft)" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--good)", marginBottom: 4 }}>Now</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{active.title}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 2 }}>{active.note}</div>
              <ActiveTimer start={active.start} end={active.end} date={selectedDate} />
            </div>
          )}
          {nextBlock && (
            <div style={{ ...cardStyle, borderLeft: "3px solid var(--accent)", background: "var(--accent-soft)" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--accent)", marginBottom: 4 }}>Up Next</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 650 }}>{nextBlock.title}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)" }}>{nextBlock.start} - {nextBlock.end}</div>
            </div>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        <div style={{ ...cardStyle, textAlign: "center" as const }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" as const, color: "var(--text-muted)", marginBottom: 4 }}>Focus</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--warn)" }}>{(deskMins / 60).toFixed(1)}h</div>
        </div>
        <div style={{ ...cardStyle, textAlign: "center" as const }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" as const, color: "var(--text-muted)", marginBottom: 4 }}>Done</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent)" }}>{blocks.length > 0 ? `${Math.round((doneCount / blocks.length) * 100)}%` : "--"}</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{doneCount} / {blocks.length}</div>
        </div>
        <div style={{ ...cardStyle, textAlign: "center" as const }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" as const, color: "var(--text-muted)", marginBottom: 4 }}>Blocks</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text)" }}>{blocks.length}</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{blocks.filter(b => b.priority === "must").length} must</div>
        </div>
      </div>

      {/* Timeline */}
      {blocks.length === 0 ? (
        <div style={{ textAlign: "center" as const, padding: "40px 20px", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "0.9rem" }}>No schedule for this date.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
          {blocks.map(b => {
            const s = timeToDate(selectedDate, b.start);
            const e = timeToDate(selectedDate, b.end);
            const isCurrent = now >= s && now < e;
            const isMissed = !b.completed && !isCurrent && now >= e;
            const isPrayer = b.type === "prayer";

            let bg = "transparent";
            let border = "1px solid transparent";
            if (b.completed) bg = "transparent";
            else if (isCurrent) { bg = "var(--good-soft)"; border = "1px solid var(--good)"; }
            else if (isMissed) { bg = "var(--danger-soft)"; border = "1px solid var(--danger)"; }

            return (
              <div key={b.id} style={{
                display: "grid", gridTemplateColumns: "80px 1fr 28px",
                gap: 8, alignItems: "center", padding: "8px 10px",
                borderRadius: 4, background: bg, border,
                borderLeft: isPrayer ? "3px solid var(--good)" : undefined,
                opacity: b.completed ? 0.45 : 1,
              }}>
                <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  {b.start} - {b.end}
                  {isPrayer && <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" as const, color: "var(--good)", marginTop: 2 }}>anchor</div>}
                </div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{b.title}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{b.note}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2, textTransform: "uppercase" as const }}>{b.location} &middot; {b.priority} &middot; {b.type}</div>
                </div>
                <button
                  onClick={() => toggleMutation.mutate({ id: b.id })}
                  style={{
                    width: 26, height: 26, borderRadius: "50%",
                    border: `1px solid ${b.completed ? "var(--good)" : "var(--border)"}`,
                    background: b.completed ? "var(--good-soft)" : "transparent",
                    color: b.completed ? "var(--good)" : "var(--text)",
                    cursor: "pointer", display: "grid", placeItems: "center",
                    fontSize: "0.75rem", padding: 0,
                  }}
                >
                  {b.completed ? "\u2713" : ""}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{time}</span>;
}

function ActiveTimer({ start, end, date }: { start: string; end: string; date: string }) {
  const [label, setLabel] = useState("--:--:--");
  useEffect(() => {
    const tick = () => {
      const e = timeToDate(date, end);
      setLabel(durationLabel(e.getTime() - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [start, end, date]);
  return <div style={{ fontSize: "2rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", marginTop: 6 }}>{label}</div>;
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 14,
};

const navBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: "50%",
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--text)", cursor: "pointer", display: "grid",
  placeItems: "center", fontSize: "0.85rem",
};
```

- [ ] **Step 2: Verify page renders**

```bash
cd /Users/ayaan/Developer/day-planner/app && pnpm dev
```

Open `http://localhost:3000`. Expected: Dark dashboard with date nav, stats row, empty timeline (no blocks yet for today in DB).

- [ ] **Step 3: Commit and push**

```bash
cd /Users/ayaan/Developer/day-planner
git add app/src/
git commit -m "feat: T3 dashboard page — schedule from DB, stats, timeline, theme toggle"
git push
```

---

## Spec Coverage (Phase 1)

| Requirement | Task |
|------------|------|
| T3 scaffold (Next.js + tRPC + Prisma + Tailwind) | Task 1 |
| Prisma schema (Schedule, Block, PatternLog) | Task 2 |
| SQLite database | Task 2 |
| Schedule CRUD via tRPC | Task 4 |
| Prayer times API via tRPC | Task 4 |
| Pattern insights via tRPC | Task 4 |
| Shared types + constants | Task 3 |
| Dual theme CSS tokens | Task 5 |
| Dashboard page with timeline | Task 6 |
| Theme toggle | Task 6 |
| Block completion toggle | Task 6 |
| Date navigation | Task 6 |
| NOW + NEXT hero cards | Task 6 |
| Focus hours + stats | Task 6 |

### Not in Phase 1 (deferred to Phase 2+)
- Chat integration (OpenRouter + Thesys)
- Voice input
- Smart agent with pattern awareness
- dnd-kit drag-and-drop
- Inline block editing
- Chat drawer UI
- Week glance dots
- Life progress bars
- Type chart
- Pattern insights widget
