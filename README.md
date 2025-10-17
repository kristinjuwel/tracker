# 🧭 Tracker App

A **full-stack collaborative task tracker** built with **Next.js (App Router) + TypeScript + Supabase**, featuring collections, tasks, assignees, reminders with scheduled emails, and fine-grained role-based access control.

---

## 📸 Project Overview

Tracker helps teams organize work into **collections**, manage **tasks**, assign **members**, track **progress**, and set reminders — all stored securely under Supabase Row Level Security (RLS).

### Demo / Screenshots
<img width="1615" height="914" alt="image" src="https://github.com/user-attachments/assets/7beb5823-981a-4ff1-aec4-f183ccd140fd" />
<img width="1569" height="906" alt="image" src="https://github.com/user-attachments/assets/a5821ae6-4335-41d8-8108-17e99b2bb3b9" />
<img width="1337" height="682" alt="image" src="https://github.com/user-attachments/assets/8c6f2162-f58f-4569-a8bc-d3d6550c07c6" />
<img width="1211" height="577" alt="image" src="https://github.com/user-attachments/assets/8612c25e-00ae-44fa-b369-a765d17e68e9" />
<img width="1187" height="659" alt="image" src="https://github.com/user-attachments/assets/5229212a-5933-4c5a-90cc-15ef465cffb2" />


### Key Highlights

* **Role-based access** for collections (owner, editor, viewer)
* **Task dependencies, tags, and reminders**
* **Auth flows:** signup, login, password reset, magic link
* **Responsive dashboard** built with shadcn/ui and TailwindCSS
* **Secure RLS policies** enforce access at the database layer

---

## 🧩 Data Model

### Entity Relationship Diagram

<img width="1281" height="667" alt="image" src="https://github.com/user-attachments/assets/59e6639f-6657-40df-bdd9-ac2eb34ec2a9" />


---

## ⚙️ Local Setup Guide

### 1. Requirements

* **Node.js 18+**
* **Supabase project** (free tier works fine)

### 2. Environment Variables

Copy the example file and configure:

```bash
cp .env.development.example .env.local
```

| Variable                                       | Description                                                  |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`                     | Supabase project URL (from your project settings)            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                | Supabase public anon key (used by client)                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` | Optional alias for frameworks needing explicit naming        |
| `SUPABASE_URL`                                 | Supabase project URL (server-side)                           |
| `SUPABASE_ANON_KEY`                            | Supabase anon key (server-side)                              |
| `SUPABASE_SERVICE_ROLE_KEY`                    | Supabase service role key (⚠️ keep secret — server use only) |
| `SUPABASE_JWT_SECRET`                          | JWT signing secret (used for server auth verification)       |


| Variable                   | Description                           |
| -------------------------- | ------------------------------------- |
| `POSTGRES_URL`             | Main connection string (pooled)       |
| `POSTGRES_PRISMA_URL`      | Prisma connection string (non-pooled) |
| `POSTGRES_URL_NON_POOLING` | Non-pooled fallback connection string |
| `POSTGRES_DATABASE`        | Database name                         |
| `POSTGRES_HOST`            | Database host                         |
| `POSTGRES_USER`            | Database username                     |
| `POSTGRES_PASSWORD`        | Database password                     |

### 3. Database Setup / Migration

1. Go to **Supabase SQL Editor**
2. Run the schema in [`supabase/migrations/0001_schema.sql`]([supabase/migrations/0001_schema.sql](https://drive.google.com/file/d/1QhYC5aReD7zVVXRGQXMpuzUYaemLHhD-/view?usp=sharing))

   * Creates tables, enums, triggers, and RLS policies
   * Automatically adds the creator as the **collection owner**

### 4. Run the App

```bash
npm install
npm run dev
```

App runs on **[http://localhost:3000](http://localhost:3000)**

---

## 🧱 Feature Mapping

| Requirement              | Implemented Feature                                              |
| ------------------------ | ---------------------------------------------------------------- |
| Authentication           | Supabase Auth (signup, login, forgot password, magic link)       |
| Collections & Membership | `collections`, `user_collections` with owner/editor/viewer roles |
| Tasks CRUD               | Full task lifecycle with status, priority, dates, parent task    |
| Task Relations           | Dependencies, tags, and user assignments                         |
| Reminders                | Scheduled email reminders via `/api/cron/send-reminders`         |
| Security                 | Supabase Row Level Security + Next.js middleware                 |
| UI/UX                    | shadcn/ui components + Tailwind responsive design                |
| Deployment               | Ready for Vercel (environment variables supported)               |

---

## 🧠 Access Control Notes (RLS)

**Row Level Security (RLS)** is enforced directly in Supabase Postgres.

| Table                | RLS Policy Summary                                         |
| -------------------- | ---------------------------------------------------------- |
| **profiles**         | Everyone can read; users can update their own profile      |
| **collections**      | Visible to members and creator; creator = auto owner       |
| **user_collections** | Only owners can manage membership                          |
| **tasks**            | Readable by collection members; writable by editors/owners |
| **reminders**        | Readable by members; created by author or editor           |

All queries in Next.js use the Supabase client authenticated by session, ensuring the database enforces access automatically.

---

## 📬 Cron Reminder Endpoint

**Endpoint:** `POST /api/cron/send-reminders`
**Header:** `x-cron-secret: $CRON_SECRET`

Runs every minute to check upcoming reminders and send via **Resend**.

Example manual trigger:

```powershell
$headers = @{ "x-cron-secret" = "$env:CRON_SECRET" }
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/send-reminders" -Method POST -Headers $headers
```

See [`README-reminders.md`](README-reminders.md) for details.

---

## 🧑‍💻 AI Tools Used

This project was built and documented with the help of the following **AI tools & MCPs**:

| Tool / Product              | Purpose                                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| **ChatGPT (GPT-5)**         | Code architecture design, Supabase SQL generation, documentation writing |
| **GitHub Copilot**          | Auto-completion for repetitive UI logic (shadcn/ui components)           |

---

## 🚀 Deployment Notes

* Recommended: **Vercel + Supabase**
* Add all `.env.local` variables to Vercel → Project → Settings → Environment Variables
* In **Supabase Auth → URL Configuration**, whitelist:

  ```
[  https://tracker-iota-seven.vercel.app
](https://tracker-iota-seven.vercel.app/)  
http://localhost:3000
  ```
* Enable email templates (signup, invite, magic link) for branding consistency.

---

