// app/api/tasks/comments/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

// GET ?task_id=uuid
// POST { task_id, content }
export async function GET(req: Request) {
  const supabase = await createClient();
  const task_id = new URL(req.url).searchParams.get("task_id");
  if (!task_id) return bad("task_id is required");
  const { data, error } = await supabase
    .from("comments")
    .select("*, author_id")
    .eq("task_id", task_id)
    .order("created_at", { ascending: true });
  if (error) return bad(error.message);
  return ok(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  if (!body?.task_id || !body?.content)
    return bad("task_id and content are required");
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from("comments")
    .insert({
      task_id: body.task_id,
      content: body.content,
      author_id: user?.id,
    })
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data, 201);
}
