import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return bad(error.message, 404);
  return ok(data);
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const patch = await req.json();
  const { data, error } = await supabase
    .from("collections")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) return bad(error.message);
  return ok({ ok: true });
}
