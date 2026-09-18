# Personal Task Tracker

Single-user task tracker built with Next.js, Neon Postgres (via Vercel Marketplace), and shadcn/ui.

## Features

- Quick-add tasks, edit details in a side panel
- Five prioritization views over the same data: Today, List (P1/P2/P3), Eisenhower Matrix (drag between quadrants), Ranked (drag-and-drop order), Score (impact ÷ effort)
- Due dates with overdue highlighting
- Projects (colored) and tags, with filters
- Recurring tasks: completing one spawns the next occurrence
- Subtasks / checklists
- Single-password login (cookie session)

## Setup

```bash
npm install
vercel link && vercel env pull   # pulls DATABASE_URL etc.
npx drizzle-kit push             # create tables
npm run dev
```

Environment variables (`.env.local` / Vercel project settings):

- `DATABASE_URL` – provided by the Neon integration
- `APP_PASSWORD` – the password you sign in with
- `SESSION_SECRET` – random string used to sign the session cookie

Deploys happen automatically on push to `main` via Vercel's Git integration.
