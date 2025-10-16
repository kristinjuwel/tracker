// app/api/tasks/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

export async function GET(req: Request) {
  const supabase = await createClient();
  const url = new URL(req.url);
  const col_id = url.searchParams.get("col_id");
  const q = supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  const { data, error } = col_id ? await q.eq("col_id", col_id) : await q;
  if (error) return bad(error.message);
  return ok(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  if (!body?.col_id || !body?.name) return bad("col_id and name are required");
  const user = (await supabase.auth.getUser()).data.user;
  const payload = {
    col_id: body.col_id,
    name: body.name,
    description: body.description ?? null,
    status: body.status ?? "pending",
    priority: body.priority ?? "medium",
    progress: body.progress ?? 0,
    link: body.link ?? null,
    start_date: body.start_date ?? null,
    end_date: body.end_date ?? null,
    deadline: body.deadline ?? null,
    image: body.image ?? null,
    parent_task_id: body.parent_task_id ?? null,
    created_by: user?.id,
  };
  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data, 201);
}
