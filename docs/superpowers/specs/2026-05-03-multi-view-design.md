# Multi-View Dashboard + Block Visualizations Design Spec

## Overview
Implement all 5 app layout directions as switchable views + Radial Clock visualization (day/week/month scales) + Ribbon Pills visualization. All views share the same tRPC data layer and dual-theme system.

## View Switcher
Top-level toggle in header — 5 labeled buttons. Click switches entire layout. Persisted in `localStorage` key `day-planner-view`. Default: `classic`.

```
[Classic] [Timeline] [Chat] [Zen] [Dense]
```

Implementation: URL query param `?view=classic|timeline|chat|zen|dense`. Each view is a separate React component rendered conditionally.

## Shared Data Layer
All views consume the same hooks:

### useSchedule(date: string)
Returns: `{ schedule, blocks, active, nextBlock, doneCount, completionPct, deskMins, typeMins, refetch }`

### useTimer(targetTime: Date)
Returns: `{ label, ms, pct }` — live countdown, updates every second

### useTheme()
Returns: `{ theme, toggleTheme }` — dark/light toggle with localStorage

### useViewPreference()
Returns: `{ view, setView }` — which layout view is active

### useChatAgent(date, location)
Returns: `{ messages, send, loading, chatHistory }` — chat state + API calls

## New tRPC Router: getByRange
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

## View 1: PostHog Classic

### Layout
```
┌──────────┬──────────────────────────────────┐
│ Sidebar  │  Top bar: date + tabs + actions  │
│ 220px    ├──────────────────────────────────┤
│          │  NOW + NEXT hero cards           │
│ Planner  │  Day/Week/Year progress cards    │
│ History  │  Focus / Done / Week row         │
│ Insights │  Block types bar                 │
│ Templates│  Schedule blocks (list)          │
│ Settings │                                  │
│          │  Chat bar (bottom)               │
└──────────┴──────────────────────────────────┘
```

### Colors (use theme tokens, NOT hardcoded)
- Background: `var(--bg)` — maps to cream in light, navy in dark
- Cards: `var(--surface-1)` with `var(--border)` border
- Accent: `var(--accent)` — orange in light, blue in dark
- Sidebar: `var(--bg)` with right border

### Tabs
`today` | `week` | `month` — switches content area. Week/month use `getByRange`.

### Sidebar Nav Items
`Planner` (active), `History`, `Insights`, `Templates`, `Settings` — only Planner works in Phase 1, others show "Coming soon" state.

### Components
- `Sidebar.tsx` — 220px fixed, nav items, clock at bottom
- `ClassicView.tsx` — orchestrates the card grid layout
- Shared: `NowNextCards`, `StatsRow`, `TypeChart`, `BlockList`, `DateNav`

## View 2: Timeline Command (Dark)

### Layout
```
┌─────────────────────────────────────────┐
│ Top bar: logo + date + DAY/WEEK/YEAR %  │
├─────────────────────────────────────────┤
│ ACTIVE: block name    01:19:52   NEXT   │
├─────────────────────────────────────────┤
│ Horizontal Gantt Timeline (4am–9pm)     │
│ [████████░░░░░░░██░░░░░░████░░█░░░█]   │
│                      ▲ now              │
├──────────────────────┬──────────────────┤
│ Schedule list        │ Detail panel     │
│ (click to select)    │ (selected block) │
│                      │ 280px            │
├──────────────────────┴──────────────────┤
│ Chat input bar                          │
└─────────────────────────────────────────┘
```

### Key Elements
- Monospace font (`var(--font-mono)`) for all text
- Horizontal Gantt: blocks as positioned divs, width = duration %, colored by type
- Now indicator: orange vertical line + dot at current time position
- Click block on Gantt or list → shows details in right panel
- Top bar: `61% DAY | 95% WEEK | 34% YEAR` inline stats

### Components
- `TimelineView.tsx` — orchestrates layout
- `GanttTimeline.tsx` — horizontal positioned blocks with hour markers + now line
- `BlockDetailPanel.tsx` — right panel showing selected block details

## View 3: Conversational Flow

### Layout
```
┌────────────────────┬───────────────────┐
│ Chat column        │ Schedule column   │
│ flex: 1            │ 360px             │
│                    ├───────────────────┤
│ Agent messages     │ Tabs: Schedule    │
│ with inline blocks │      Stats        │
│                    │      Week         │
│                    ├───────────────────┤
│                    │ Mini stats grid   │
│                    │ Type bar          │
│                    │ Block list        │
├────────────────────┤                   │
│ Chat input (pill)  │                   │
└────────────────────┴───────────────────┘
```

### Key Elements
- Chat is PRIMARY — full height left column
- User messages: dark bg bubbles, right-aligned
- Agent messages: text + inline block cards (blocks render inside chat)
- Right panel: live schedule view with tabs (Schedule/Stats/Week)
- Block cards in chat have colored left border, time, title, type
- "Schedule generated: N blocks" confirmation chip after agent sends schedule

### Components
- `ChatView.tsx` — two-column layout
- `ChatPanel.tsx` — messages + input (full height, not drawer)
- `InlineBlockCard.tsx` — block card rendered inside chat messages
- `ScheduleSidebar.tsx` — right panel with tabs

## View 4: Zen Focus

### Layout
```
┌─────────────────────────────────────────┐
│ DAY PLANNER              SUN, MAY 3    │ (minimal top bar)
│                                         │
│                                         │
│                  NOW                    │
│          Work block 2                   │ (56px serif-like)
│     Continue working on tasks           │
│                                         │
│            01:19:52                     │ (72px, accent color)
│         ███████░░░░░░                   │
│                                         │
│   Next: Asr salah  in 1h 34m           │
│                                         │
│ DAY 61%                          [chat] │ (stats at edges)
│ WEEK 95%                                │
│ YEAR 34%                                │
├─────────────────────────────────────────┤
│ ▬▬▬  15 blocks · 61% complete          │ (pull-up handle)
│ [expandable schedule drawer]            │
└─────────────────────────────────────────┘
```

### Key Elements
- Centered content, serif or thin weight typography for title
- Massive timer: 72px, `var(--accent)` color
- One block visible at a time — the active block
- Stats tucked to bottom-left corner (small, muted)
- Floating chat button bottom-right (48px circle, accent bg)
- Pull-up drawer at bottom: collapsed shows block count, expand shows full timeline
- No cards, no grids, no dashboards — pure focus

### Components
- `ZenView.tsx` — centered layout
- `FocusTimer.tsx` — giant countdown
- `ScheduleDrawer.tsx` — pull-up expandable block list
- `FloatingChatButton.tsx` — opens chat overlay

## View 5: Dense Dashboard (Dark)

### Layout
```
┌─────────────────────────────────────────┐
│ Day Planner [overview|schedule|insights] │ (top tab nav)
├──────────────────┬──────────────────────┤
│ CURRENT BLOCK    │ UP NEXT              │
│ (spans 2 cols)   │                      │
├──────┬──────┬────┴──────────────────────┤
│ DAY  │ WEEK │ YEAR                      │
├──────┴──────┼───────────────────────────┤
│ BLOCK TYPES │ WEEK + FOCUS + DONE       │
│ (spans 2)   │                           │
├─────────────┼───────────────────────────┤
│ SCHEDULE    │ AGENT (chat panel)        │
│ (spans 2)   │                           │
└─────────────┴───────────────────────────┘
```

### Key Elements
- CSS Grid: `grid-template-columns: 1fr 1fr 320px`
- Everything visible at once — no hidden panels or drawers
- Top tab nav: `overview | schedule | insights | history`
- Dark surfaces: `var(--surface-1)` cards on `var(--bg)`
- Compact spacing, small fonts — power user density
- Agent chat embedded as a grid panel (not overlay or drawer)

### Components
- `DenseView.tsx` — CSS grid layout
- `DenseChat.tsx` — chat embedded in grid panel (compact, no drawer)

## Block Visualizations

### Radial Clock

#### Day Clock (from prototype 6A)
- SVG 400x400 viewBox
- 24h clock face, blocks as colored arcs between `innerR=100` and `outerR=160`
- Hour markers every 3h (00, 03, 06, 09, 12, 15, 18, 21)
- Now indicator: orange dot + line from center to current hour angle
- Hover arc → show block details in center (title, time, type)
- Default center: date + block count

#### Week Clock (new)
- SVG 400x400
- 7 segments (Mon–Sun), each at `360/7 = 51.4°`
- Each segment subdivided into stacked arcs by block type (prayer=green, execution=orange, etc.)
- Arc thickness proportional to hours of that type for that day
- Hover segment → center shows: "Monday: 8 blocks, 7.2h focus, 92% done"
- Click segment → navigate to that day (set selectedDate)
- Today segment has accent border/glow
- Uses `getByRange` for current week data

#### Month Clock (new)
- SVG 400x400
- 28-31 segments (days of month)
- Each segment colored by completion: `var(--good)` = >80% done, `var(--warn)` = 40-80%, `var(--danger)` = <40%, `var(--surface-3)` = no schedule
- Hover segment → center shows: "May 3: Deep Work Monday, 92% done"
- Click segment → navigate to that day
- Today segment has accent border
- Uses `getByRange` for current month data

#### Shared SVG Logic
- `arcPath(startAngle, endAngle, outerR, innerR)` — generates SVG path for arc
- `hourToAngle(h)` / `dayToAngle(dayIndex, total)` — converts to radians
- Component: `RadialClock.tsx` with `scale` prop: `"day" | "week" | "month"`
- Tab bar above clock: `[Day] [Week] [Month]`

### Ribbon + Pills

- Horizontal bar at top: blocks as flex segments, width = duration
- Colors by type (`TYPE_COLORS`)
- Click segment → highlight that block, show detail card below
- Below ribbon: blocks as pill buttons (rounded, colored bg)
- Selected pill: solid color bg + white text
- Unselected: tinted bg + colored text
- Detail card: expanded view of selected block (title, time, duration, type, priority)

### Where Visualizations Live
- **Classic**: as a card in the dashboard grid, with Day/Week/Month tabs
- **Timeline**: Gantt is primary, Clock as alternative toggle
- **Chat**: Clock in the right schedule sidebar
- **Zen**: hidden in pull-up drawer alongside block list
- **Dense**: Clock as one of the grid panels

## Shared Components (used across all views)

| Component | Purpose |
|-----------|---------|
| `NowNextCards.tsx` | NOW active block + NEXT upcoming block |
| `BlockList.tsx` | Vertical timeline of blocks with checkmarks |
| `BlockCard.tsx` | Single block row (time, title, note, tags, check) |
| `StatsRow.tsx` | Focus hours + Done % + Block count |
| `TypeChart.tsx` | Horizontal stacked bar by block type |
| `DateNav.tsx` | Left/right arrows + date display |
| `LifeCards.tsx` | Day/Week/Year progress cards with hover-expand |
| `RadialClock.tsx` | SVG clock (day/week/month scales) |
| `RibbonPills.tsx` | Color ribbon + tappable pills |
| `ChatPanel.tsx` | Chat messages + input (reusable) |
| `ChatDrawer.tsx` | Collapsible bottom drawer wrapper |
| `ViewSwitcher.tsx` | 5-button toggle in header |
| `ThemeToggle.tsx` | Sun/moon button |
| `Clock.tsx` | Live clock display |

## File Structure
```
app/src/
  hooks/
    useSchedule.ts
    useTimer.ts
    useTheme.ts
    useViewPreference.ts
    useChatAgent.ts
  components/
    shared/
      NowNextCards.tsx
      BlockList.tsx
      BlockCard.tsx
      StatsRow.tsx
      TypeChart.tsx
      DateNav.tsx
      LifeCards.tsx
      ViewSwitcher.tsx
      ThemeToggle.tsx
      Clock.tsx
    chat/
      ChatPanel.tsx
      ChatDrawer.tsx
      ChatMessage.tsx
      InlineBlockCard.tsx
      FloatingChatButton.tsx
    visualizations/
      RadialClock.tsx
      RibbonPills.tsx
      GanttTimeline.tsx
    views/
      ClassicView.tsx
      Sidebar.tsx
      TimelineView.tsx
      BlockDetailPanel.tsx
      ChatView.tsx
      ScheduleSidebar.tsx
      ZenView.tsx
      FocusTimer.tsx
      ScheduleDrawer.tsx
      DenseView.tsx
  app/
    page.tsx              # View router — renders active view
    layout.tsx            # Theme provider + tRPC
    api/chat/route.ts     # Chat API (exists)
```

## Implementation Order
1. Extract shared hooks from page.tsx (useSchedule, useTimer, useTheme)
2. Extract shared components (BlockCard, BlockList, NowNextCards, StatsRow, etc.)
3. Build ViewSwitcher + view routing in page.tsx
4. Build Classic view (sidebar + card grid) — closest to current
5. Build Dense view (CSS grid, everything visible)
6. Build Chat view (two-column, chat-first)
7. Build Timeline view (Gantt + detail panel)
8. Build Zen view (focus + drawer)
9. Build Radial Clock (day first, then week, then month)
10. Build Ribbon Pills
11. Add getByRange tRPC query for week/month data

## Success Criteria
1. All 5 views render correctly and switch instantly
2. View preference persists across refreshes
3. All views share same schedule data (no duplication)
4. Radial Clock shows day/week/month with hover + click
5. Ribbon Pills shows compact schedule with detail-on-demand
6. Chat works in all views (drawer, inline, or embedded)
7. Dual theme (dark/light) works across all views
8. Timers update live in all views
