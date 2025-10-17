# Reminders feature

This app supports task reminders with email notifications.

Database changes (run in Supabase SQL editor):

1. Ensure the `reminders` table exists and add a `sent_at` column to mark processed reminders.

```sql
alter table public.reminders add column if not exists sent_at timestamptz;
create index if not exists idx_reminders_sent_at on public.reminders(sent_at);
```

Optional columns (target specific recipients):

```sql
alter table public.reminders add column if not exists recipient_user_ids uuid[];
create index if not exists idx_reminders_recipients on public.reminders using gin (recipient_user_ids);
```

Scheduling:

- Create a Supabase Scheduled Function or external cron to POST to:

  POST https://<your-domain>/api/cron/send-reminders

  with header `x-cron-secret: <CRON_SECRET>`.

Environment variables (set in Vercel/Next runtime and locally):

- SUPABASE_SERVICE_ROLE_KEY: your Supabase service role key (server only)
- CRON_SECRET: random secret shared with the scheduler
- NEXT_PUBLIC_SITE_URL: public base URL used in email links
- Optional email provider (Resend):
  - RESEND_API_KEY
  - EMAIL_FROM (e.g. "Tracker <no-reply@yourdomain>")

API endpoints:

- GET /api/tasks/reminders?task_id=UUID – list reminders for a task
- POST /api/tasks/reminders – create a reminder { task_id, due_at, details, recipient_user_ids? }
- PATCH /api/tasks/reminders/:id – update a reminder
- DELETE /api/tasks/reminders/:id – delete a reminder
