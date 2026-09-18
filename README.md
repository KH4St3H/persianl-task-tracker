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
- Google Calendar (optional): open tasks with a due date become all-day events on a dedicated "Tasks" calendar; today's events from your other calendars show in the Today view

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
- `NEXT_PUBLIC_APP_TIMEZONE` – IANA zone (e.g. `Europe/Helsinki`) used for "today", due dates and calendar times
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – optional, enables the Calendar integration

## Google Calendar setup

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project, enable the **Google Calendar API**.
2. Configure the OAuth consent screen (External, add your own Google account as a test user).
3. Create an **OAuth client ID** of type Web application with these authorized redirect URIs:
   - `http://localhost:3000/api/google/callback`
   - `https://personal-task-tracker-ten.vercel.app/api/google/callback`
4. Put the client ID and secret in `.env.local` and in Vercel (`vercel env add GOOGLE_CLIENT_ID production` etc.).
5. Open **Settings** in the app and click **Connect Google Calendar**.

Deploys happen automatically on push to `main` via Vercel's Git integration.
