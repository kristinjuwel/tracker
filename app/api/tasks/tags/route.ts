// app/api/tasks/tags/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

// GET ?task_id=uuid
// POST { task_id, tag_id }
export async function GET(req: Request) {
  const supabase = await createClient();
  const task_id = new URL(req.url).searchParams.get("task_id");
  if (!task_id) return bad("task_id is required");
  const { data, error } = await supabase
    .from("task_tags")
    .select("*, tags(name)")
    .eq("task_id", task_id);
  if (error) return bad(error.message);
  return ok(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  if (!body?.task_id || !body?.tag_id)
    return bad("task_id and tag_id are required");
  const { data, error } = await supabase
    .from("task_tags")
    .insert(body)
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data, 201);
}
