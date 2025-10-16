// app/api/tasks/reminders/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

// GET ?task_id=uuid
// POST { task_id, due_at, details? }
export async function GET(req: Request) {
  const supabase = await createClient();
  const task_id = new URL(req.url).searchParams.get("task_id");
  if (!task_id) return bad("task_id is required");
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("task_id", task_id)
    .order("due_at", { ascending: true });
  if (error) return bad(error.message);
  return ok(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  if (!body?.task_id || !body?.due_at)
    return bad("task_id and due_at are required");
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from("reminders")
    .insert({
      task_id: body.task_id,
      due_at: body.due_at,
      details: body.details ?? null,
      created_by: user?.id,
    })
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data, 201);
}
