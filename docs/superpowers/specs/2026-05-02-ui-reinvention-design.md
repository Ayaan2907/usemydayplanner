# UI Reinvention — PostHog-Inspired Dual Theme Design Spec

## Overview
Reinvent the V1 UI (`public/index.html`) with PostHog-inspired design patterns: flat layered surfaces, compact components (4-6px radius), hidden accent color on hover, editorial single-column layout, collapsible chat drawer, dual theme (dark default + warm light mode). Then carry this design into V2 T3 app.

## Scope
- Rewrite CSS custom properties for dual theme
- Restructure HTML layout: editorial flow, chat as bottom drawer
- Restyle all components: cards, buttons, pills, timeline, inputs
- Add theme toggle (sun/moon) with localStorage persistence
- Keep all existing JS functionality intact

## Theme System

### Dark Mode (default)
```css
[data-theme="dark"] {
  --bg:          #0c0f1a;
  --surface-1:   #141825;
  --surface-2:   #1c2033;
  --surface-3:   #252a3f;
  --text:        #e8ecf4;
  --text-muted:  #8891a8;
  --border:      #2a3048;
  --border-hover: #3d4463;
  --accent:      #3b82f6;
  --accent-soft: rgba(59, 130, 246, 0.12);
  --good:        #34d399;
  --good-soft:   rgba(52, 211, 153, 0.12);
  --warn:        #fbbf24;
  --warn-soft:   rgba(251, 191, 36, 0.12);
  --danger:      #f87171;
  --danger-soft: rgba(248, 113, 113, 0.12);
  --shadow:      0 25px 50px -12px rgba(0, 0, 0, 0.4);
  --input-bg:    #0f1220;
}
```

### Light Mode (PostHog warm)
```css
[data-theme="light"] {
  --bg:          #fdfdf8;
  --surface-1:   #f5f5f0;
  --surface-2:   #eeefe9;
  --surface-3:   #e5e7e0;
  --text:        #23251d;
  --text-muted:  #65675e;
  --border:      #bfc1b7;
  --border-hover: #a0a298;
  --accent:      #F54E00;
  --accent-soft: rgba(245, 78, 0, 0.08);
  --good:        #16a34a;
  --good-soft:   rgba(22, 163, 74, 0.08);
  --warn:        #d97706;
  --warn-soft:   rgba(217, 119, 6, 0.08);
  --danger:      #dc2626;
  --danger-soft: rgba(220, 38, 38, 0.08);
  --shadow:      0 25px 50px -12px rgba(0, 0, 0, 0.15);
  --input-bg:    #eeefe9;
}
```

### Shared Tokens
```css
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
```

### Theme Toggle
- Sun/moon icon button in header
- Toggles `data-theme` attribute on `<html>`
- Persisted in `localStorage` key `day-planner-theme`
- Default: `dark`

## Layout

### Structure (editorial single-column)
```html
<div class="app">
  <header class="header">...</header>
  <main class="main">
    <section class="day-header">title + note + date nav</section>
    <section class="life-cards">day/week/year</section>
    <section class="hero-blocks">NOW + NEXT</section>
    <section class="dash-row">focus + done + week + types</section>
    <section class="timeline">block list</section>
  </main>
  <aside class="chat-drawer">collapsible chat</aside>
</div>
```

### Main Layout
- Single column, max-width 880px, centered
- Padding: 16px sides, 12px between sections
- No CSS grid columns — pure vertical flow
- Scroll: main area scrolls, header fixed, chat drawer fixed bottom

### Header
- Fixed top, full width
- Left: "Day Planner" text (16px, weight 700)
- Right: location inputs, theme toggle, clock
- Height: ~48px
- Bottom border: 1px `--border`
- Background: `--bg`

## Component Specs

### Cards
```css
.card {
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);  /* 6px */
  padding: 14px;
  /* NO backdrop-filter, NO heavy shadow */
}
.card:hover {
  border-color: var(--border-hover);
}
```

### Buttons
```css
.btn {
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);  /* 4px */
  padding: 7px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: color var(--ease-fast), border-color var(--ease-fast);
}
.btn:hover {
  color: var(--accent);           /* hidden accent flash */
  border-color: var(--border-hover);
}

.btn-primary {
  background: var(--text);        /* dark btn in light, light btn in dark */
  color: var(--bg);
}
.btn-primary:hover {
  opacity: 0.7;                   /* PostHog opacity hover */
}
```

### Inputs
```css
input, select {
  background: var(--input-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);  /* 4px */
  padding: 7px 10px;
  font-size: 0.85rem;
  outline: none;
}
input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
input::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}
```

### Pills / Badges
```css
.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);  /* 4px, not 999px */
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--surface-2);
  color: var(--text-muted);
  border: 1px solid var(--border);
}
.pill:hover { color: var(--accent); }
.pill-good { background: var(--good-soft); color: var(--good); border-color: transparent; }
.pill-warn { background: var(--warn-soft); color: var(--warn); border-color: transparent; }
```

### Timeline Items
```css
.tl-item {
  display: grid;
  grid-template-columns: 80px 1fr 28px;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-radius: var(--radius-sm);  /* 4px */
  border: 1px solid transparent;
  background: transparent;
  transition: background var(--ease-fast), border-color var(--ease-fast);
}
.tl-item:hover {
  background: var(--surface-1);
  border-color: var(--border);
}
.tl-item.current {
  background: var(--good-soft);
  border-color: var(--good);
}
.tl-item.missed {
  background: var(--danger-soft);
  border-color: var(--danger);
}
.tl-item.done { opacity: 0.45; }
.tl-item.prayer {
  border-left: 3px solid var(--good);
}
```

### Life Progress Cards
```css
.life-card {
  padding: 12px;
  cursor: default;
  transition: transform var(--ease-fast);
}
.life-card:hover {
  transform: translateY(-1px);
}
.life-card-pct {
  font-size: 1.5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}
.life-card-track {
  height: 4px;  /* thinner */
  border-radius: var(--radius-pill);
  background: var(--surface-3);
}
.life-card-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--accent);  /* solid, not gradient */
}
```

### NOW + NEXT Hero
```css
.hero-blocks {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 8px;
}
.now-card {
  border-left: 3px solid var(--good);
  background: var(--good-soft);
}
.now-card .timer {
  font-size: 2rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text);  /* no gradient text — flat */
}
.next-card {
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
}
```

### Progress Ring
- Keep SVG donut
- Stroke color: `var(--accent)` (solid, not gradient)
- Background stroke: `var(--surface-3)`
- Text inside: percentage

### Type Chart
- Colored bars remain
- Colors slightly muted in light mode
- Legend uses `var(--text-muted)` with colored dots

## Chat Drawer

### HTML
```html
<aside class="chat-drawer" id="chatDrawer" data-state="collapsed">
  <div class="chat-handle" id="chatHandle">
    <div class="chat-handle-bar"></div>
  </div>
  <div class="chat-input-row">
    <button class="btn btn-mic" id="micBtn">🎤</button>
    <input type="text" id="chatInput" placeholder="Chat with agent..." />
    <button class="btn btn-primary" id="sendBtn">Send</button>
  </div>
  <div class="chat-messages" id="chatMessages">
    <!-- messages here -->
  </div>
</aside>
```

### CSS
```css
.chat-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface-1);
  border-top: 1px solid var(--border);
  z-index: 50;
  transition: height var(--ease-slow);
  display: flex;
  flex-direction: column;
}

.chat-drawer[data-state="collapsed"] {
  height: 56px;  /* just input bar visible */
}
.chat-drawer[data-state="open"] {
  height: 40vh;
}
.chat-drawer[data-state="full"] {
  height: 70vh;
}

.chat-handle {
  display: flex;
  justify-content: center;
  padding: 6px;
  cursor: ns-resize;
}
.chat-handle-bar {
  width: 40px;
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--border);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column-reverse;  /* newest at bottom */
  gap: 8px;
}

.chat-drawer[data-state="collapsed"] .chat-messages {
  display: none;
}
```

### Behavior
- Default: collapsed (56px — input bar visible)
- Click input or handle: expand to `open` (40vh)
- Click handle again or drag up: `full` (70vh)
- Click handle down or press Escape: collapse
- Persist state in sessionStorage (not localStorage — fresh each session)
- Main content gets `padding-bottom: 56px` to prevent overlap

## Responsive

### < 700px
- Life cards: 1 column stack
- Hero blocks: 1 column stack (NOW above NEXT)
- Dash row: 2x2 grid
- Header: location inputs hidden, only GPS button

### 700px+
- Full layout as specced

## Migration Notes

### What stays
- All JS logic (state, render functions, chat, voice, notifications)
- HTML element IDs (all `$()` references unchanged)
- localStorage keys unchanged

### What changes
- CSS completely rewritten (theme system, flat surfaces, compact radius)
- HTML restructured (single column, chat drawer at bottom)
- Some element references added (theme toggle, chat drawer state)
- Background: remove radial gradients, use flat `--bg`

### New localStorage keys
- `day-planner-theme` — "dark" | "light"

## Success Criteria
1. Dark mode looks clean, flat, modern — not glassmorphic
2. Light mode feels warm, earthy, PostHog-like
3. Theme toggle works and persists
4. Chat drawer collapses/expands smoothly
5. All existing functionality preserved (chat, voice, timeline, dashboards, notifications)
6. Interactive hover accent flash on buttons, pills, timeline items
7. Life progress cards hover-expand with stats
8. Content-dense editorial feel — not card-heavy dashboard
