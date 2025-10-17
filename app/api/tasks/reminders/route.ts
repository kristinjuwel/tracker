// app/api/tasks/reminders/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

// GET ?task_id=uuid
// POST { task_id, due_at, details?, recipient_user_ids?: uuid[] }
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
  // Try insert with recipient_user_ids if provided; if schema lacks the column, retry without it
  const insertPayload: Record<string, unknown> = {
    task_id: body.task_id,
    due_at: body.due_at,
    details: body.details ?? null,
    created_by: user?.id,
  };
  if (Array.isArray(body.recipient_user_ids)) {
    insertPayload.recipient_user_ids = body.recipient_user_ids;
  }

  let { data, error } = await supabase
    .from("reminders")
    .insert(insertPayload)
    .select()
    .single();

  if (error && /recipient_user_ids/i.test(error.message)) {
    // Remove field and retry once
    const { /* recipient_user_ids: _omit, */ ...fallbackPayload } =
      insertPayload as Record<string, unknown>;
    const retry = await supabase
      .from("reminders")
      .insert(fallbackPayload)
      .select()
      .single();
    data = retry.data as unknown;
    error = retry.error as unknown as typeof error;
  }

  if (error) return bad(error.message);
  return ok(data, 201);
}
