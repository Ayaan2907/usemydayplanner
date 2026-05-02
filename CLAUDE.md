# Day Planner — Agent Instructions

## Project Overview
Conversational AI schedule builder. Two versions: V1 (Express + vanilla HTML) and V2 (T3 stack). Both coexist in the same repo.

## Package Manager
Use `pnpm`, never `npm` or `yarn`.

## Key Constraints
- Prayer blocks (Fajr, Dhuhr, Asr, Maghrib, Isha) are IMMOVABLE anchor points
- Prayer times come from Aladhan API — never hardcode them
- Thesys C1 integration must always have a plain-text fallback
- SQLite for dev, schema designed for Postgres migration later
- Dark mode only — follow `.impeccable.md` design tokens
- V1 files (server.js, public/index.html) must remain functional — don't break them

## Architecture

### V1 (root)
- `server.js` — Express, serves static + proxies OpenRouter + fetches Aladhan
- `public/index.html` — entire frontend in one file
- Run: `pnpm start`

### V2 (app/)
- T3 stack: Next.js + tRPC + Prisma + Tailwind + shadcn/ui
- `app/src/app/` — pages and API routes
- `app/src/server/api/routers/` — tRPC routers
- `app/prisma/schema.prisma` — database schema
- Run: `cd app && pnpm dev`

## Database
- Prisma + SQLite (dev), Postgres-ready schema
- Tables: Schedule, Block, PatternLog
- Always use Prisma client, never raw SQL

## LLM Integration
- OpenRouter API via env var `OPENROUTER_API_KEY`
- System prompt injects real prayer times from Aladhan
- Agent should: ask follow-ups, suggest optimizations, reference pattern history
- Chat responses: Thesys C1 for rich UI, plain text fallback

## UI Components
- shadcn/ui for all new components
- dnd-kit for drag-and-drop block reordering
- Tailwind classes following `.impeccable.md` design tokens
- Interactive blocks: draggable, inline-editable, deletable
- Prayer blocks: not draggable, green accent, anchor badge

## Testing
- No test framework set up yet — add when needed
- Manual testing: `pnpm dev` → verify in browser

## Git
- Commit messages: conventional commits (feat/fix/docs/refactor)
- Branch: `main`
- Co-author line: `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`

## Environment Variables
```
OPENROUTER_API_KEY=     # required
OPENROUTER_MODEL=       # optional, defaults to llama-3.3-70b
THESYS_API_KEY=         # optional, enables generative UI in chat
DATABASE_URL=           # auto-set by Prisma for SQLite
```
