# Plan A: Foundation + Classic View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the monolith page.tsx into shared hooks + components, add a view switcher, and build the PostHog Classic view as the first of 5 switchable views.

**Architecture:** Extract schedule logic into `useSchedule` hook, chat logic into `useChatAgent` hook, theme into `useTheme` hook. Build reusable components (BlockCard, BlockList, NowNextCards, StatsRow, TypeChart, DateNav). Add ViewSwitcher to header. Build ClassicView with sidebar nav + tab bar + card grid dashboard. page.tsx becomes a thin router that renders the active view.

**Tech Stack:** Next.js 14, tRPC, Tailwind CSS, React hooks, CSS custom properties

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `app/src/hooks/useSchedule.ts` | Create | Schedule data + derived state (active, next, stats) |
| `app/src/hooks/useTheme.ts` | Create | Theme toggle + localStorage |
| `app/src/hooks/useTimer.ts` | Create | Live countdown/countup timer |
| `app/src/hooks/useViewPreference.ts` | Create | View selection + localStorage |
| `app/src/hooks/useChatAgent.ts` | Create | Chat state + API calls + schedule parsing |
| `app/src/components/shared/BlockCard.tsx` | Create | Single block row |
| `app/src/components/shared/BlockList.tsx` | Create | Vertical list of BlockCards |
| `app/src/components/shared/NowNextCards.tsx` | Create | NOW + NEXT hero cards |
| `app/src/components/shared/StatsRow.tsx` | Create | Focus/Done/Blocks stat cards |
| `app/src/components/shared/TypeChart.tsx` | Create | Stacked bar by block type |
| `app/src/components/shared/DateNav.tsx` | Create | Date arrows + display |
| `app/src/components/shared/ViewSwitcher.tsx` | Create | 5-view toggle buttons |
| `app/src/components/shared/ThemeToggle.tsx` | Create | Sun/moon button |
| `app/src/components/shared/LiveClock.tsx` | Create | Ticking clock display |
| `app/src/components/chat/ChatDrawer.tsx` | Create | Collapsible bottom chat |
| `app/src/components/views/ClassicView.tsx` | Create | PostHog Classic layout |
| `app/src/components/views/Sidebar.tsx` | Create | Left nav sidebar |
| `app/src/server/api/routers/schedule.ts` | Modify | Add getByRange query |
| `app/src/app/page.tsx` | Rewrite | Thin router rendering active view |

---

### Task 1: Shared hooks

**Files:**
- Create: `app/src/hooks/useSchedule.ts`
- Create: `app/src/hooks/useTheme.ts`
- Create: `app/src/hooks/useTimer.ts`
- Create: `app/src/hooks/useViewPreference.ts`
- Create: `app/src/hooks/useChatAgent.ts`

- [ ] **Step 1: Create useSchedule hook**

```typescript
// app/src/hooks/useSchedule.ts
"use client";
import { api } from "~/trpc/react";
import { timeToDate, blockMinutes } from "~/lib/utils";
import { useMemo } from "react";

export function useSchedule(date: string) {
  const { data: schedule, refetch } = api.schedule.getByDate.useQuery({ date });
  const toggleMutation = api.schedule.toggleBlock.useMutation({ onSuccess: () => void refetch() });
  const upsertMutation = api.schedule.upsert.useMutation({ onSuccess: () => void refetch() });
  const metaMutation = api.schedule.updateMeta.useMutation({ onSuccess: () => void refetch() });

  const blocks = schedule?.blocks ?? [];

  const derived = useMemo(() => {
    const now = new Date();
    const active = blocks.find(b => {
      const s = timeToDate(date, b.start);
      const e = timeToDate(date, b.end);
      return now >= s && now < e;
    });
    const nextBlock = blocks.find(b => now < timeToDate(date, b.start));
    const doneCount = blocks.filter(b => b.completed).length;
    const completionPct = blocks.length > 0 ? Math.round((doneCount / blocks.length) * 100) : 0;
    const deskBlocks = blocks.filter(b => b.location === "desk");
    const deskMins = deskBlocks.reduce((sum, b) => sum + blockMinutes(b.start, b.end), 0);
    const mustCount = blocks.filter(b => b.priority === "must").length;
    const prayerCount = blocks.filter(b => b.type === "prayer").length;

    const typeMins: Record<string, number> = {};
    blocks.forEach(b => { typeMins[b.type] = (typeMins[b.type] ?? 0) + blockMinutes(b.start, b.end); });

    return { active, nextBlock, doneCount, completionPct, deskMins, deskBlocks, mustCount, prayerCount, typeMins };
  }, [blocks, date]);

  return {
    schedule, blocks, refetch,
    ...derived,
    toggleBlock: (id: string) => toggleMutation.mutate({ id }),
    upsertSchedule: upsertMutation.mutateAsync,
    updateMeta: metaMutation.mutate,
  };
}
```

- [ ] **Step 2: Create useTheme hook**

```typescript
// app/src/hooks/useTheme.ts
"use client";
import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState("dark");

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

  return { theme, toggleTheme };
}
```

- [ ] **Step 3: Create useTimer hook**

```typescript
// app/src/hooks/useTimer.ts
"use client";
import { useState, useEffect } from "react";
import { durationLabel } from "~/lib/utils";

export function useTimer(targetMs: number | null) {
  const [label, setLabel] = useState("--:--:--");
  const [ms, setMs] = useState(0);

  useEffect(() => {
    if (targetMs === null) { setLabel("--:--:--"); setMs(0); return; }
    const tick = () => {
      const remaining = targetMs - Date.now();
      setMs(remaining);
      setLabel(durationLabel(remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  return { label, ms };
}
```

- [ ] **Step 4: Create useViewPreference hook**

```typescript
// app/src/hooks/useViewPreference.ts
"use client";
import { useState, useEffect } from "react";

export type ViewId = "classic" | "timeline" | "chat" | "zen" | "dense";

export function useViewPreference() {
  const [view, setViewState] = useState<ViewId>("classic");

  useEffect(() => {
    const saved = localStorage.getItem("day-planner-view") as ViewId | null;
    if (saved) setViewState(saved);
  }, []);

  function setView(v: ViewId) {
    setViewState(v);
    localStorage.setItem("day-planner-view", v);
  }

  return { view, setView };
}
```

- [ ] **Step 5: Create useChatAgent hook**

```typescript
// app/src/hooks/useChatAgent.ts
"use client";
import { useState, useRef, useCallback } from "react";
import { formatDateShort } from "~/lib/utils";

interface ChatMsg { role: "user" | "agent"; content: string }

export function useChatAgent(
  date: string,
  location: { lat: number | null; lng: number | null },
  onScheduleParsed: (parsed: {
    dayTitle?: string;
    dayNote?: string;
    blocks: { blockId: string; start: string; end: string; title: string; note?: string; location: string; priority: string; type: string }[];
  }) => void,
) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "agent", content: "What does your day look like? Tell me what you need to do." },
  ]);
  const [loading, setLoading] = useState(false);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: "user" as const, content: text };
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);
    historyRef.current = [...historyRef.current, userMsg];

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

      // Parse schedule JSON
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]!) as {
            dayTitle?: string; dayNote?: string;
            blocks: { blockId: string; start: string; end: string; title: string; note?: string; location: string; priority: string; type: string }[];
          };
          if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
            onScheduleParsed(parsed);
            const textPart = content.replace(/```json[\s\S]*?```/, "").trim();
            setMessages(prev => [...prev, { role: "agent", content: `${textPart}\n\n[Schedule saved: ${parsed.blocks.length} blocks for ${formatDateShort(date)}]` }]);
            return;
          }
        } catch { /* parse failed, show as text */ }
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
```

- [ ] **Step 6: Commit**

```bash
git add app/src/hooks/ && git commit -m "feat: shared hooks — useSchedule, useTheme, useTimer, useViewPreference, useChatAgent"
```

---

### Task 2: Shared components

**Files:**
- Create: `app/src/components/shared/BlockCard.tsx`
- Create: `app/src/components/shared/BlockList.tsx`
- Create: `app/src/components/shared/NowNextCards.tsx`
- Create: `app/src/components/shared/StatsRow.tsx`
- Create: `app/src/components/shared/TypeChart.tsx`
- Create: `app/src/components/shared/DateNav.tsx`
- Create: `app/src/components/shared/ViewSwitcher.tsx`
- Create: `app/src/components/shared/ThemeToggle.tsx`
- Create: `app/src/components/shared/LiveClock.tsx`
- Create: `app/src/components/chat/ChatDrawer.tsx`

The implementing agent should:

1. Read the current `page.tsx` at `app/src/app/page.tsx` to extract the exact rendering logic
2. Read the spec at `docs/superpowers/specs/2026-05-03-multi-view-design.md` for component interfaces
3. Create each component extracting logic from page.tsx

Each component must:
- Be a `"use client"` component
- Accept props (not use hooks directly for data — hooks are called by the view)
- Use `style` props with CSS custom properties (matching current pattern)
- Match the visual output of the current page.tsx exactly

Key component interfaces:

```typescript
// BlockCard props
interface BlockCardProps {
  block: { id: string; blockId: string; start: string; end: string; title: string; note: string; location: string; priority: string; type: string; completed: boolean };
  date: string;
  isCurrent: boolean;
  isMissed: boolean;
  onToggle: () => void;
}

// BlockList props
interface BlockListProps {
  blocks: BlockCardProps["block"][];
  date: string;
  activeId: string | undefined;
  onToggle: (id: string) => void;
}

// NowNextCards props
interface NowNextCardsProps {
  active: BlockCardProps["block"] | undefined;
  nextBlock: BlockCardProps["block"] | undefined;
  date: string;
}

// StatsRow props
interface StatsRowProps {
  deskMins: number;
  deskBlockCount: number;
  doneCount: number;
  totalBlocks: number;
  completionPct: number;
  mustCount: number;
  prayerCount: number;
}

// TypeChart props
interface TypeChartProps {
  typeMins: Record<string, number>;
}

// DateNav props
interface DateNavProps {
  dateStr: string;
  onPrev: () => void;
  onNext: () => void;
}

// ViewSwitcher props
interface ViewSwitcherProps {
  active: ViewId;
  onChange: (view: ViewId) => void;
}

// ChatDrawer — uses useChatAgent internally
interface ChatDrawerProps {
  date: string;
  location: { lat: number | null; lng: number | null };
  onScheduleParsed: (parsed: any) => void;
}
```

- [ ] **Step 1: Create all component files**

Create each file following the interfaces above. Extract rendering logic from current `page.tsx`. Use the same inline `style` patterns (CSS custom properties).

- [ ] **Step 2: Verify components compile**

```bash
cd /Users/ayaan/Developer/day-planner/app && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/ && git commit -m "feat: shared components — BlockCard, BlockList, NowNextCards, StatsRow, TypeChart, DateNav, ViewSwitcher, ChatDrawer"
```

---

### Task 3: Add getByRange tRPC query

**Files:**
- Modify: `app/src/server/api/routers/schedule.ts`

- [ ] **Step 1: Add getByRange procedure**

Add after the existing `getByDate` procedure:

```typescript
  getByRange: publicProcedure
    .input(z.object({ start: z.string(), end: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.schedule.findMany({
        where: { date: { gte: input.start, lte: input.end } },
        include: { blocks: { orderBy: { sortOrder: "asc" } } },
        orderBy: { date: "asc" },
      });
    }),
```

- [ ] **Step 2: Verify compiles**

```bash
cd /Users/ayaan/Developer/day-planner/app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/server/api/routers/schedule.ts && git commit -m "feat: add getByRange tRPC query for week/month data"
```

---

### Task 4: Classic View + Sidebar

**Files:**
- Create: `app/src/components/views/ClassicView.tsx`
- Create: `app/src/components/views/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar**

```typescript
// app/src/components/views/Sidebar.tsx
"use client";
import { useState } from "react";

const NAV_ITEMS = [
  { id: "planner", icon: "◫", label: "Planner" },
  { id: "history", icon: "↻", label: "History" },
  { id: "insights", icon: "◔", label: "Insights" },
  { id: "templates", icon: "❐", label: "Templates" },
  { id: "settings", icon: "⚙", label: "Settings" },
];

export function Sidebar({ clock }: { clock: string }) {
  const [activeNav, setActiveNav] = useState("planner");

  return (
    <div style={{
      width: 220, borderRight: "1px solid var(--border)", background: "var(--bg)",
      display: "flex", flexDirection: "column", flexShrink: 0, height: "100%",
    }}>
      <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>Day Planner</div>
      </div>
      <nav style={{ padding: "8px", flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <div key={item.id} onClick={() => setActiveNav(item.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
              borderRadius: 6, cursor: "pointer", fontSize: 14,
              fontWeight: activeNav === item.id ? 600 : 400,
              background: activeNav === item.id ? "var(--surface-2)" : "transparent",
              color: activeNav === item.id ? "var(--text)" : "var(--text-muted)",
              marginBottom: 2, transition: "all 0.15s",
            }}>
            <span style={{ fontSize: 16, opacity: 0.7 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
        {clock}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ClassicView**

The implementing agent should build this component following the prototype Direction 1 from `/tmp/planner/project/directions.jsx` lines 37-205. Key layout:
- `display: flex` — Sidebar (220px fixed) + main content (flex: 1)
- Main content: top bar (date + tabs + actions) → NOW/NEXT cards → Day/Week/Year progress → Focus/Done/Week row → Block types bar → Schedule blocks list → Chat bar at bottom
- Tab bar: `today | week | month` (today active by default)
- Uses shared components: `NowNextCards`, `StatsRow`, `TypeChart`, `BlockList`, `DateNav`
- Props: receives all data from useSchedule hook

- [ ] **Step 3: Verify compiles**

```bash
cd /Users/ayaan/Developer/day-planner/app && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/src/components/views/ && git commit -m "feat: Classic view with sidebar nav + tab bar + card grid dashboard"
```

---

### Task 5: Page.tsx view router

**Files:**
- Rewrite: `app/src/app/page.tsx`

- [ ] **Step 1: Rewrite page.tsx as thin view router**

```typescript
// app/src/app/page.tsx
"use client";

import { useState, useCallback } from "react";
import { useSchedule } from "~/hooks/useSchedule";
import { useTheme } from "~/hooks/useTheme";
import { useViewPreference } from "~/hooks/useViewPreference";
import { ViewSwitcher } from "~/components/shared/ViewSwitcher";
import { ThemeToggle } from "~/components/shared/ThemeToggle";
import { LiveClock } from "~/components/shared/LiveClock";
import { ClassicView } from "~/components/views/ClassicView";
import { todayStr, formatDateShort } from "~/lib/utils";

export default function Page() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [userLocation, setUserLocation] = useState<{ lat: number | null; lng: number | null }>(() => {
    if (typeof window === "undefined") return { lat: null, lng: null };
    try {
      const saved = localStorage.getItem("day-planner-location");
      return saved ? (JSON.parse(saved) as { lat: number | null; lng: number | null }) : { lat: null, lng: null };
    } catch { return { lat: null, lng: null }; }
  });

  const schedule = useSchedule(selectedDate);
  const { theme, toggleTheme } = useTheme();
  const { view, setView } = useViewPreference();

  function shiftDate(offset: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  const handleScheduleParsed = useCallback(async (parsed: {
    dayTitle?: string; dayNote?: string;
    blocks: { blockId: string; start: string; end: string; title: string; note?: string; location: string; priority: string; type: string }[];
  }) => {
    await schedule.upsertSchedule({
      date: selectedDate,
      title: parsed.dayTitle ?? "",
      note: parsed.dayNote ?? "",
      blocks: parsed.blocks.map(b => ({ ...b, note: b.note ?? "" })),
    });
    if (parsed.dayTitle ?? parsed.dayNote) {
      schedule.updateMeta({ date: selectedDate, title: parsed.dayTitle, note: parsed.dayNote });
    }
  }, [selectedDate, schedule]);

  function requestGeo() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        localStorage.setItem("day-planner-location", JSON.stringify(loc));
      },
    );
  }

  const viewProps = {
    date: selectedDate,
    schedule,
    onShiftDate: shiftDate,
    location: userLocation,
    onScheduleParsed: handleScheduleParsed,
  };

  return (
    <>
      {/* Global header — shown for all views except Zen (which has its own minimal bar) */}
      {view !== "zen" && (
        <header style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 48,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "0 16px", background: "var(--bg)", borderBottom: "1px solid var(--border)", zIndex: 40,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Day Planner</span>
            <ViewSwitcher active={view} onChange={setView} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={requestGeo} style={btnStyle}>GPS</button>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <LiveClock />
          </div>
        </header>
      )}

      {/* View renderer */}
      {view === "classic" && <ClassicView {...viewProps} />}
      {view === "timeline" && <div style={{ padding: "60px 16px", color: "var(--text-muted)", textAlign: "center" }}>Timeline view — coming soon</div>}
      {view === "chat" && <div style={{ padding: "60px 16px", color: "var(--text-muted)", textAlign: "center" }}>Chat view — coming soon</div>}
      {view === "zen" && <div style={{ padding: "60px 16px", color: "var(--text-muted)", textAlign: "center" }}>Zen view — coming soon</div>}
      {view === "dense" && <div style={{ padding: "60px 16px", color: "var(--text-muted)", textAlign: "center" }}>Dense view — coming soon</div>}
    </>
  );
}

const btnStyle: React.CSSProperties = {
  background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)",
  borderRadius: 4, padding: "5px 10px", cursor: "pointer", fontSize: "0.82rem",
  fontWeight: 600, fontFamily: "var(--font-sans)",
};
```

- [ ] **Step 2: Verify it renders**

```bash
cd /Users/ayaan/Developer/day-planner/app && pnpm dev
```

Open `http://localhost:3000`. Expected: Header with view switcher (5 buttons), Classic view renders with sidebar + dashboard. Other views show "coming soon".

- [ ] **Step 3: Commit and push**

```bash
git add app/src/ && git commit -m "feat: view router + Classic view — first of 5 switchable layouts

- Decomposed monolith page.tsx into shared hooks + components
- useSchedule, useTheme, useTimer, useViewPreference, useChatAgent hooks
- Shared components: BlockCard, BlockList, NowNextCards, StatsRow, TypeChart, DateNav
- ViewSwitcher in header with 5 layout options
- Classic view: PostHog-style sidebar + tab bar + card grid
- Other 4 views stubbed as coming soon
- getByRange tRPC query for week/month data" && git push
```

---

## Spec Coverage (Plan A)

| Requirement | Task |
|------------|------|
| Extract useSchedule hook | Task 1 |
| Extract useTheme hook | Task 1 |
| Extract useTimer hook | Task 1 |
| useViewPreference hook | Task 1 |
| useChatAgent hook | Task 1 |
| BlockCard, BlockList components | Task 2 |
| NowNextCards, StatsRow, TypeChart | Task 2 |
| DateNav, ViewSwitcher, ThemeToggle | Task 2 |
| ChatDrawer component | Task 2 |
| getByRange tRPC query | Task 3 |
| Classic View (sidebar + tabs + cards) | Task 4 |
| Sidebar nav (Planner/History/etc) | Task 4 |
| Page.tsx view router | Task 5 |
| View switching persisted in localStorage | Task 1 + 5 |

### Deferred to Plan B
- Timeline Command view
- Conversational Flow view
- Zen Focus view
- Dense Dashboard view

### Deferred to Plan C
- Radial Clock (day/week/month)
- Ribbon + Pills
