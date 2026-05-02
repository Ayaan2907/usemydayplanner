# Day Manager Dashboard — Evolution Prompt

## What exists now
A single-file, zero-build HTML dashboard at `day-manager.html`. It runs entirely in the browser with vanilla JavaScript, no frameworks, no build step, no server required. Open the file in any browser and it works.

## Current feature set
- **Live time block tracking**: shows current active block, countdown timer to block end, and next block preview
- **Prayer-anchored schedule**: hard-coded blocks for Fajr, Dhuhr, Asar, Maghrib, Isha with work blocks interleaved
- **Block states**: blocks auto-classify as CURRENT / DONE / MISSED / UPCOMING based on time + user checkmarks
- **Manual checkmarks**: click the circle on any timeline block to mark done/undone; persists per-day in localStorage
- **Mood modes**: Low / Medium / High energy adapts the guidance text for the current block
- **Flex mode**: "Soft" suggests catch-up shortcuts when behind schedule; "Off" is strict
- **View filters**: All / Desk only / Away only / Prayer only
- **Notifications**: browser notifications + in-page toast + audio tone when blocks transition
- **GitHub integration**: connect with repo/branch/token to fetch commits and PR activity for the selected date; auto-syncs every 5 minutes
- **Auto-progress bar**: weighted score combining elapsed time (35%), confirmed completions (40%), and GitHub delivery signal (25%) when connected
- **Date picker**: plan any date; defaults to tomorrow if after 6pm, today otherwise
- **Per-day persistence**: checkmarks and GitHub metrics are isolated by date

## Architecture rules (preserve these)
- **Single HTML file**: all CSS in `<style>`, all JS in `<script>`
- **Vanilla JavaScript only**: no React, no Vue, no build tools, no npm
- **No external dependencies**: no CDN libraries; use browser APIs directly (fetch, Notification, AudioContext, localStorage)
- **localStorage for persistence**: `day-manager-completed-YYYY-MM-DD` for checkmarks; `day-manager-github-settings-v1` for repo/branch (not token)
- **CSS custom properties** for theming; dark-first glassmorphism aesthetic
- **Responsive**: collapses to single column below 930px
- **Accessible**: proper labels, focus states, aria where needed

## The data model
```javascript
const BLOCKS = [
  { id: "wake", start: "04:30", end: "04:35", title: "...", note: "...", location: "away|desk", priority: "must|should|stretch", type: "routine|prayer|build|company|..." }
  // ... 20 blocks total covering 04:30 to 22:10
];
```

Blocks are mapped to the selected plan date to create `startAt`/`endAt` Date objects. The active block is found by `now >= startAt && now < endAt`.

## GitHub integration details
- Uses `https://api.github.com/repos/{owner}/{name}/commits?sha={branch}&since={start}&until={end}`
- Uses `https://api.github.com/repos/{owner}/{name}/pulls?state=all&sort=updated&direction=desc` + `state=open&head={owner}:{branch}`
- Token is used from input field only (never persisted); repo/branch are persisted
- Rate limit remaining is displayed
- Commits, PR updates, merges, and open PRs are shown as metric pills

## What to implement next (priority order)

### 1. Multi-day schedule storage (most important)
**Problem**: BLOCKS array is hard-coded for a single day. The user wants to schedule "day after tomorrow" and beyond with different blocks.

**Solution**:
- Add an "Edit schedule" panel (collapsible) in the controls section
- Store per-day block overrides in localStorage: `day-manager-blocks-YYYY-MM-DD`
- If no override exists, fall back to the default BLOCKS array
- Allow adding, removing, editing blocks for any selected date
- Block editor fields: id, start time, end time, title, note, location, priority, type
- Validate: no overlapping blocks, start < end, id uniqueness per day
- Add "Copy default schedule to this date" and "Reset to default" buttons

### 2. Recurring block templates
**Problem**: prayers and wake times are the same most days; only work blocks change.

**Solution**:
- Create a `TEMPLATES` object:
  ```javascript
  const TEMPLATES = {
    default: [...BLOCKS],
    workday: [...],      // heavy desk blocks
    movingday: [...],    // heavy away blocks
    restday: [...],      // minimal blocks
    custom: []           // user-built
  };
  ```
- Add a template selector dropdown above the timeline
- "Apply template to [selected date]" button
- Store template choice per date: `day-manager-template-YYYY-MM-DD`

### 3. Dashboard widgets (make it feel like a dashboard)
**Problem**: currently a single-page tracker; needs more at-a-glance information.

**Solution** (add as new card panels in the grid):
- **Weekly overview card** (grid-column: 1 / -1): 7-day mini calendar showing completion heatmap (green = high completion, red = low, gray = future)
- **Stats card** (grid-column: span 4): average wake time, average block completion %, most missed block type, current streak (consecutive days with >80% must completion)
- **GitHub activity graph** (grid-column: span 4): commits per hour for the selected date, visual bar chart using CSS flex + div heights
- **Focus timer card** (grid-column: span 4): Pomodoro-style 25/5 timer that can be started within any block, with auto-logging of focus sessions to localStorage

### 4. Task nesting within blocks
**Problem**: some blocks contain multiple sub-tasks (e.g., "Company merge sprint 1" has audit diffs, set merge order, resolve conflicts).

**Solution**:
- Add optional `tasks` array to block objects:
  ```javascript
  { id: "merge-1", ..., tasks: [
    { id: "audit", text: "Audit branch diffs", done: false },
    { id: "order", text: "Set merge order", done: false },
    { id: "resolve", text: "Start conflict resolution", done: false }
  ]}
  ```
- Render tasks as a nested checklist under the block in the timeline when expanded
- Click a block to expand/collapse its tasks
- Task completion contributes to block completion: block auto-marks done when all tasks done
- Store tasks in `day-manager-tasks-YYYY-MM-DD`

### 5. Block-to-GitHub auto-mapping
**Problem**: user manually marks "merge-1" done; it should auto-complete when a PR is merged.

**Solution**:
- Add optional `githubTrigger` to blocks:
  ```javascript
  { id: "merge-1", ..., githubTrigger: { type: "pr_merged", branch: "staging", count: 1 } }
  ```
- During GitHub sync, evaluate triggers:
  - `pr_merged`: auto-mark done if N PRs merged to branch today
  - `commit_count`: auto-mark done if N commits pushed to branch today
  - `pr_opened`: auto-mark done if N PRs opened from branch today
- Show a "linked" icon on auto-completed blocks; allow manual override
- Store auto-completion reason: `day-manager-autodone-YYYY-MM-DD` = `{ blockId: "pr_merged: #123" }`

### 6. Prayer time auto-fetch
**Problem**: prayer times are hard-coded; they change by location and season.

**Solution**:
- Use a free API like `https://api.aladhan.com/v1/timingsByCity?city=Dubai&country=UAE&method=2`
- Add city/country/method inputs in controls
- Fetch prayer times for selected date, auto-adjust Fajr/Dhuhr/Asar/Maghrib/Isha block times
- Cache response per day in localStorage: `day-manager-prayers-YYYY-MM-DD`
- Fallback to hard-coded times if API fails

### 7. Export and import
**Problem**: data is trapped in this browser's localStorage.

**Solution**:
- "Export day" button: downloads `day-manager-YYYY-MM-DD.json` with blocks, checkmarks, tasks, notes
- "Export week" button: downloads 7 days in one JSON array
- "Import" button: file input that merges or replaces data for imported dates
- Show conflict resolution UI if imported date already has data

### 8. Notes and journaling
**Problem**: no place to capture what actually happened during a block.

**Solution**:
- Add a "Notes" textarea to each block (visible when expanded)
- Store in `day-manager-notes-YYYY-MM-DD`
- At shutdown block, auto-compile a "Day summary" markdown snippet from all notes
- Add a "Week review" view that shows all notes from the last 7 days

### 9. Built-in AI planning agent (priority — the user wants this now)
**Problem**: the user must manually write prompts to get an agent to generate tomorrow's schedule. The dashboard should have an embedded agent interface that compiles all context and produces a ready-to-send prompt — or calls an API directly.

**Solution**:
- Add a collapsible "AI Planner" chat panel (text + voice via Web Speech API)
- When activated, it auto-compiles a rich context package:
  - Selected date + day of week
  - Template used (or default BLOCKS)
  - Yesterday's / last 7 days' completion stats
  - Most missed block types and priorities
  - GitHub delivery signal (commits, PRs, merges)
  - Current streak
  - User's typed or spoken natural language request (e.g., "tomorrow I have a dentist at 10am and need to ship the landing page")
- The panel displays two modes:
  1. **Prompt mode** (default, no API key needed): renders a fully structured markdown prompt with all context. One-click "Copy prompt" button. User pastes this into Claude / ChatGPT / another Oz agent and pastes the JSON response back.
  2. **Direct mode** (optional): if user provides an OpenAI/Anthropic API key, the page calls the API directly using `fetch`. Response is parsed as JSON schedule and auto-applied to the selected date.
- The prompt must include instructions for the receiving agent to return valid JSON matching the `BLOCKS` schema with `id`, `start`, `end`, `title`, `note`, `location`, `priority`, `type`, and optional `tasks` and `githubTrigger`.
- After receiving a schedule (paste or API), show a diff view: old blocks vs new blocks, with accept / reject / merge buttons.
- Store generated schedules in `day-manager-generated-YYYY-MM-DD` with a `source: "ai-agent"` tag.
- The chat panel should feel like a quick conversation: "What should tomorrow look like?" → user types/speaks → agent compiles context → prompt ready → user sends → schedule applied.
- Add a `SpeechRecognition` fallback: if `webkitSpeechRecognition` is available, show a mic button for voice input. Transcribed text goes into the chat input.
- **Critical constraint**: keep it in one file. The API key is used from an input field only, never persisted to localStorage. Prompt compilation is pure JS string building.

## File location
Current file: `/Users/ayaan/Developer/advanceIQ.ai/day-manager.html`

## Style constraints for all new work
- Match existing aesthetic: dark navy background, glassmorphism cards (`rgba(255,255,255,0.08)` + `backdrop-filter: blur(8px)`), rounded corners (12–18px), subtle borders
- Use existing CSS custom properties; add new ones if needed
- All new buttons use existing button classes (`primary`, `good`, default)
- New cards use `.card` class
- All interactive elements have hover/focus states
- Toast notifications for user feedback
- No external fonts; use system font stack
- Monospace for code/metrics using `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`

## Success criteria
1. User can open the file, select any future date, and see a schedule for that date
2. User can edit the schedule for any date without affecting other dates
3. User can apply templates to quickly set up common day types
4. The dashboard feels information-dense but not cluttered (like a good cockpit)
5. All data persists across browser restarts via localStorage
6. GitHub integration continues to work and auto-completes mapped blocks
7. Everything remains a single HTML file that opens with a double-click

## What NOT to do
- Do NOT add a build step (no webpack, no vite, no bundler)
- Do NOT split into multiple files (no separate CSS/JS files)
- Do NOT add a backend or database
- Do NOT use a framework (no React, no Svelte, no Vue)
- Do NOT use TypeScript
- Do NOT add external CSS/JS libraries from CDN
- Do NOT make it mobile-first (desktop-first, responsive fallback is fine)

## Context for the agent
The user is a software engineer with a busy schedule mixing spiritual practices (Islamic prayers), company work (GitHub merge management), side projects (Wingmic landing page), and personal logistics (moving, family). They want this tool to feel like a personal operating system — minimal friction, maximum clarity, everything visible at a glance. They value "shipping over polishing" but appreciate thoughtful UX details.
