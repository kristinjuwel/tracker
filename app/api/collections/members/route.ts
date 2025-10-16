// app/api/collections/members/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

// GET ?col_id=uuid  — list members
// POST { col_id, user_id, role } — add/update member (owners only via RLS)
export async function GET(req: Request) {
  const supabase = await createClient();
  const col_id = new URL(req.url).searchParams.get("col_id");
  if (!col_id) return bad("col_id is required");
  const { data, error } = await supabase
    .from("user_collections")
    .select("*")
    .eq("col_id", col_id);
  if (error) return bad(error.message);
  return ok(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  if (!body?.col_id || !body?.user_id)
    return bad("col_id and user_id are required");
  const { data, error } = await supabase
    .from("user_collections")
    .upsert({
      col_id: body.col_id,
      user_id: body.user_id,
      role: body.role ?? "viewer",
    })
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data, 201);
}
