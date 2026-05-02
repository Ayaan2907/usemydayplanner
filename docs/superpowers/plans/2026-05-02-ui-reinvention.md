# UI Reinvention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite V1 UI with PostHog-inspired dual theme (dark/light), editorial single-column layout, collapsible chat drawer, flat surfaces, and compact components.

**Architecture:** Single file rewrite of `public/index.html`. CSS is fully replaced (theme tokens, flat surfaces, 4-6px radius). HTML is restructured (single column, chat drawer at bottom). All JS logic preserved — only additions are theme toggle and chat drawer state management.

**Tech Stack:** Vanilla HTML/CSS/JS (same as V1, no new dependencies)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `public/index.html` | Rewrite | Full CSS rewrite + HTML restructure + minor JS additions |

This is a single-file rewrite. The file is ~1200 lines. We'll do it as a complete rewrite since CSS and HTML are both changing fundamentally.

---

### Task 1: Complete rewrite of public/index.html

Since this is a single HTML file where CSS, HTML, and JS are tightly coupled, the cleanest approach is a full rewrite. All existing JS functions are preserved exactly — only CSS and HTML structure change, plus two small JS additions (theme toggle, chat drawer).

**Files:**
- Rewrite: `public/index.html`

- [ ] **Step 1: Write the new public/index.html**

The file is too large for inline code in a plan. Instead, the implementing agent should:

1. Read the current `public/index.html` to understand all JS functions and element IDs
2. Read the spec at `docs/superpowers/specs/2026-05-02-ui-reinvention-design.md` for exact CSS values
3. Write the new file following these rules:

**CSS changes (replace entire `<style>` block):**
- Replace `:root` with shared tokens + `[data-theme="dark"]` + `[data-theme="light"]` blocks (exact values in spec sections "Dark Mode" and "Light Mode")
- Remove all `backdrop-filter`, `radial-gradient` backgrounds, gradient fills
- All `border-radius` values: cards = 6px (`--radius-md`), buttons/inputs/pills/timeline = 4px (`--radius-sm`)
- Cards: `background: var(--surface-1)`, `border: 1px solid var(--border)`, no shadow, no blur
- Buttons: `background: var(--surface-2)`, hover = `color: var(--accent)` (accent flash)
- `.btn-primary`: `background: var(--text)`, `color: var(--bg)`, hover = `opacity: 0.7`
- Inputs: `background: var(--input-bg)`, focus = `border-color: var(--accent)` + `box-shadow: 0 0 0 2px var(--accent-soft)`
- Pills: 4px radius (not 999px), `background: var(--surface-2)`, hover = `color: var(--accent)`
- Timeline items: transparent bg at rest, `background: var(--surface-1)` on hover, state-specific colors using `--good-soft`, `--danger-soft`
- Life cards: `color: var(--accent)` for percentage, `background: var(--accent)` for fill (solid, no gradient)
- NOW card: `border-left: 3px solid var(--good)`, `background: var(--good-soft)`, timer = `color: var(--text)` (no gradient text)
- NEXT card: `border-left: 3px solid var(--accent)`, `background: var(--accent-soft)`
- Progress ring: stroke = solid `var(--accent)`, bg stroke = `var(--surface-3)`
- Body background: `background: var(--bg)` (flat, no gradients)
- Layout: `.app` = no grid columns, `.main` = `max-width: 880px`, `margin: 0 auto`, `padding: 60px 16px 72px`
- Header: `position: fixed`, `top: 0`, full width, `height: 48px`, `border-bottom: 1px solid var(--border)`, `background: var(--bg)`, `z-index: 40`
- Chat drawer: `position: fixed`, `bottom: 0`, full width, 3 states via `data-state` attribute (collapsed=56px, open=40vh, full=70vh)
- Chat messages: `flex-direction: column` (not column-reverse), hidden when collapsed
- Responsive at 700px: life cards 1-col, hero 1-col, dash-row 2x2
- Scrollbar: `background: var(--surface-2)` for thumb

**HTML structure changes:**
```
<html data-theme="dark">
  <body>
    <div class="app">
      <header class="header">
        <h1>Day Planner</h1>
        <div class="header-right">
          <div class="location-bar">...</div>
          <button id="themeToggle" class="btn">☀</button>  <!-- NEW -->
          <span class="clock" id="liveClock">--:--:--</span>
        </div>
      </header>
      <main class="main">
        <!-- same sections as current, in this order: -->
        <!-- day-header (title + note + controls) -->
        <!-- life-cards (3 cards) -->
        <!-- hero-blocks (NOW + NEXT) -->
        <!-- dash-row (focus + done + week) -->
        <!-- type chart card -->
        <!-- timeline -->
      </main>
      <aside class="chat-drawer" id="chatDrawer" data-state="collapsed">
        <div class="chat-handle" id="chatHandle"><div class="chat-handle-bar"></div></div>
        <div class="chat-input-row">
          <button class="btn btn-mic" id="micBtn">🎤</button>
          <input type="text" id="chatInput" placeholder="Chat with agent..." autocomplete="off" />
          <button class="btn btn-primary" id="sendBtn">Send</button>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="msg agent">What does your day look like?</div>
        </div>
      </aside>
    </div>
    <div class="toast" id="toast"></div>
  </body>
</html>
```

**All element IDs must be preserved** (the JS references them via `$("id")`):
`liveClock`, `dayBar`, `weekBar`, `yearBar`, `dateDisplay`, `nowCard`, `nextCard`, `currentTitle`, `currentNote`, `currentTimer`, `currentProgress`, `currentPills`, `nextTitle`, `nextTime`, `nextTimer`, `nextPills`, `progressLabel`, `ringFill`, `ringText`, `weekDots`, `weekLabel`, `timeline`, `emptyState`, `toast`, `chatMessages`, `chatInput`, `cityInput`, `countryInput`, `dayTitleInput`, `dayNoteInput`, `summaryValue` (remove — replaced by focusHours), `summaryLabel` (remove — replaced by focusMeta), `dayPct`, `dayDetail`, `dayExtra`, `weekPct`, `weekDetail`, `weekExtra`, `yearPct`, `yearDetail`, `yearExtra`, `focusHours`, `focusMeta`, `typeChart`, `typeLegend`, `typeChartCard`, `prevDay`, `nextDay`, `saveBtn`, `notifyBtn`, `sendBtn`, `micBtn`, `geoBtn`

**JS additions (append to existing `<script>`):**

```javascript
// === THEME TOGGLE ===
function initTheme() {
  const saved = localStorage.getItem("day-planner-theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeButton(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("day-planner-theme", next);
  updateThemeButton(next);
}

function updateThemeButton(theme) {
  $("themeToggle").textContent = theme === "dark" ? "\u2600" : "\u263D";
}

$("themeToggle").addEventListener("click", toggleTheme);
initTheme();

// === CHAT DRAWER ===
const chatDrawer = $("chatDrawer");
const chatHandle = $("chatHandle");

function setChatState(state) {
  chatDrawer.setAttribute("data-state", state);
  sessionStorage.setItem("day-planner-chat-state", state);
}

chatHandle.addEventListener("click", () => {
  const current = chatDrawer.getAttribute("data-state");
  if (current === "collapsed") setChatState("open");
  else if (current === "open") setChatState("full");
  else setChatState("collapsed");
});

chatInput.addEventListener("focus", () => {
  if (chatDrawer.getAttribute("data-state") === "collapsed") {
    setChatState("open");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && chatDrawer.getAttribute("data-state") !== "collapsed") {
    setChatState("collapsed");
    chatInput.blur();
  }
});
```

- [ ] **Step 2: Verify in browser**

Run: `node server.js` (or if already running, refresh browser)
Open: `http://localhost:3000`

Check:
1. Dark mode by default — flat navy surfaces, no glassmorphism, no gradients
2. Click sun button → switches to warm parchment light mode
3. Click moon button → back to dark
4. Refresh → theme persists
5. Chat drawer at bottom — collapsed, shows input bar
6. Click chat input → drawer expands to 40vh
7. Click handle → expands to 70vh
8. Press Escape → collapses
9. Type message + send → agent responds (existing chat works)
10. Life cards show percentages, hover to expand
11. NOW/NEXT cards show current block with timer
12. Timeline items: hover accent, checkmarks work
13. All pills are 4px radius, not rounded
14. All cards are 6px radius, flat surfaces
15. Buttons flash accent color on hover
16. Voice mic button works
17. Date navigation works
18. Responsive: resize to <700px → single column layout

- [ ] **Step 3: Commit and push**

```bash
git add public/index.html
git commit -m "feat: UI reinvention — dual theme, editorial layout, chat drawer

- Dark default + PostHog-warm light mode with theme toggle
- Editorial single-column layout (max-width 880px)
- Chat moves to collapsible bottom drawer (collapsed/open/full)
- Flat layered surfaces — no glassmorphism, no backdrop-filter
- Compact components: 4px buttons/inputs, 6px cards
- Hidden accent color flash on hover (blue dark, orange light)
- Solid accent fills replacing gradient fills
- All existing functionality preserved

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push
```

---

## Spec Coverage Check

| Spec Requirement | Covered |
|-----------------|---------|
| Dual theme (dark + light) | Task 1 CSS |
| Theme toggle with persistence | Task 1 JS |
| Editorial single-column layout | Task 1 HTML |
| Chat as bottom drawer (3 states) | Task 1 HTML + JS |
| Flat surfaces (no glass/blur) | Task 1 CSS |
| Compact radius (4-6px) | Task 1 CSS |
| Hidden accent hover flash | Task 1 CSS |
| PostHog opacity hover on primary btn | Task 1 CSS |
| Life cards hover-expand | Task 1 (existing JS preserved) |
| NOW + NEXT hero cards | Task 1 (existing JS preserved) |
| Progress ring solid accent | Task 1 CSS |
| Type chart preserved | Task 1 (existing JS preserved) |
| All JS functionality preserved | Task 1 (no JS removed) |
| Responsive < 700px | Task 1 CSS |
| localStorage theme key | Task 1 JS |
| sessionStorage chat state | Task 1 JS |
