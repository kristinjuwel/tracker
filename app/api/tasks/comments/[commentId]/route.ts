// app/api/tasks/comments/[commentId]/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

type RouteContext = { params: Promise<{ commentId: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const { commentId } = await context.params;
  const supabase = await createClient();
  const patch = await req.json();
  const { data, error } = await supabase
    .from("comments")
    .update(patch)
    .eq("id", commentId)
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { commentId } = await context.params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);
  if (error) return bad(error.message);
  return ok({ ok: true });
}
