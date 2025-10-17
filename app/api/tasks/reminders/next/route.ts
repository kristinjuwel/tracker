// app/api/tasks/reminders/next/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

// GET ?task_ids=uuid,uuid,uuid -> returns map of task_id -> { id, task_id, due_at }
export async function GET(req: Request) {
  const supabase = await createClient();
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("task_ids");
  if (!idsParam) return ok({});
  const taskIds = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!taskIds.length) return ok({});

  // Fetch all unsent reminders for these tasks and reduce to earliest per task
  const { data, error } = await supabase
    .from("reminders")
    .select("id, task_id, due_at, sent_at")
    .is("sent_at", null)
    .in("task_id", taskIds)
    .order("due_at", { ascending: true });
  if (error) return bad(error.message);

  const map: Record<string, { id: string; task_id: string; due_at: string }> =
    {};
  for (const r of (data ?? []) as Array<{
    id: string;
    task_id: string;
    due_at: string;
  }>) {
    if (!map[r.task_id]) {
      map[r.task_id] = { id: r.id, task_id: r.task_id, due_at: r.due_at };
    }
  }

  return ok(map);
}
