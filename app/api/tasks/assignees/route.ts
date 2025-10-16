// app/api/tasks/assignees/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

// GET ?task_id=uuid
// POST { task_id, user_id, role? }
export async function GET(req: Request) {
  const supabase = await createClient();
  const task_id = new URL(req.url).searchParams.get("task_id");
  if (!task_id) return bad("task_id is required");
  const { data, error } = await supabase
    .from("user_tasks")
    .select("*")
    .eq("task_id", task_id);
  if (error) return bad(error.message);
  return ok(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  if (!body?.task_id || !body?.user_id)
    return bad("task_id and user_id are required");
  const { data, error } = await supabase
    .from("user_tasks")
    .upsert({
      task_id: body.task_id,
      user_id: body.user_id,
      role: body.role ?? "assignee",
    })
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data, 201);
}
