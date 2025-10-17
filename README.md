# Tracker App

A full‑stack task tracker built with Next.js (App Router) + TypeScript + Supabase (Postgres + Auth), featuring collections, tasks, tags, assignees, comments, reminders with cron emails, and role-based access.

## Tech stack

- Next.js App Router (TypeScript, RSC, Route Handlers)
- Supabase (Postgres, Auth, RLS)
- shadcn/ui + TailwindCSS
- Resend (optional) for reminder emails

## Features

- Auth flows: sign up, login, logout, forgot/update password.
- Collections and membership with roles (owner/editor/viewer).
- Tasks with status, priority, dates, parent tasks, attachments (image URL), and links.
- Many‑to‑many: task assignees, task tags; collection members.
- Comments on tasks.
- Task dependencies.
- Reminders with scheduled email sending.
- Protected pages and APIs via Supabase session and RLS.

## Repository map (key files)

- API routes:
  - Tasks: [app/api/tasks/route.ts](app/api/tasks/route.ts), [app/api/tasks/[id]/route.ts](app/api/tasks/%5Bid%5D/route.ts)
  - Collections: [app/api/collections/route.ts](app/api/collections/route.ts), [app/api/collections/[id]/route.ts](app/api/collections/%5Bid%5D/route.ts), members: [app/api/collections/members/route.ts](app/api/collections/members/route.ts), [app/api/collections/members/[userId]/route.ts](app/api/collections/members/%5BuserId%5D/route.ts)
  - Tags: [app/api/tags/route.ts](app/api/tags/route.ts), task↔tags: [app/api/tasks/tags/route.ts](app/api/tasks/tags/route.ts), [app/api/tasks/tags/[tagId]/route.ts](app/api/tasks/tags/%5BtagId%5D/route.ts)
  - Assignees: [app/api/tasks/assignees/route.ts](app/api/tasks/assignees/route.ts), [app/api/tasks/assignees/[userId]/route.ts](app/api/tasks/assignees/%5BuserId%5D/route.ts)
  - Comments: [app/api/tasks/comments/route.ts](app/api/tasks/comments/route.ts), [app/api/tasks/comments/[commentId]/route.ts](app/api/tasks/comments/%5BcommentId%5D/route.ts)
  - Dependencies: [app/api/tasks/dependencies/route.ts](app/api/tasks/dependencies/route.ts), [app/api/tasks/dependencies/[depId]/route.ts](app/api/tasks/dependencies/%5BdepId%5D/route.ts)
  - Reminders: [app/api/tasks/reminders/route.ts](app/api/tasks/reminders/route.ts), [app/api/cron/send-reminders/route.ts](app/api/cron/send-reminders/route.ts)
  - Profiles: [app/api/profiles/me/route.ts](app/api/profiles/me/route.ts)
- Supabase helpers:
  - Server/client/admin: [lib/supabase/server.ts](lib/supabase/server.ts), [lib/supabase/client.ts](lib/supabase/client.ts), [lib/supabase/admin.ts](lib/supabase/admin.ts)
- UI:
  - Task editor: [components/task-details-dialog.tsx](components/task-details-dialog.tsx)
  - Collection members: [components/collection-members.tsx](components/collection-members.tsx)
  - Tasks pages: [app/(dashboard)/tasks/page.tsx](<app/(dashboard)/tasks/page.tsx>), [app/(dashboard)/collections/[id]/page.tsx](<app/(dashboard)/collections/%5Bid%5D/page.tsx>)

## Local setup

1. Prereqs

- Node 18+
- Supabase project (get URL and anon/service keys)

2. Env vars

- Copy `.env.development.example` to `.env.local` and fill values.
- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Reminders/cron (optional): `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `REMINDER_WINDOW_MS` (defaults to 60000 ms)

3. Database schema and RLS

- Open Supabase SQL Editor and run the SQL in supabase/migrations/0001_schema.sql (provided below in this README).
- This creates tables, relationships, RLS policies, and triggers (auto-create profile and auto-assign collection owner).

4. Install and run

```powershell
# from repo root
npm install
npm run dev
```

App runs at http://localhost:3000

## Reminders cron

- Endpoint: POST /api/cron/send-reminders
- Header: x-cron-secret: $CRON_SECRET
- Schedules: every minute
- Email provider: Resend (optional). Set `RESEND_API_KEY` and `EMAIL_FROM`.

Example trigger:

```powershell
$headers = @{ "x-cron-secret" = "$env:CRON_SECRET" }
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/send-reminders" -Method POST -Headers $headers
```

See [README-reminders.md](README-reminders.md) for extra details.

## RLS overview

- Profiles: users can update their own profile; all authenticated users can read profiles (used for member lists and email routing).
- Collections: visible to members and creator. Creator is auto-added as owner via trigger.
- Tasks, comments, tags, assignees, dependencies, reminders: readable by collection members; updates are limited by membership role or authorship (comments/reminders).

## Types (optional)

Generate types from Supabase:

```bash
# Using the Supabase CLI (if installed)
supabase gen types typescript --project-id <project-ref> --schema public > types/database.types.ts
```
