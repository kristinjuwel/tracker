// app/api/tasks/comments/[commentId]/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

type P = { params: { commentId: string } };

export async function PATCH(req: Request, { params }: P) {
  const supabase = await createClient();
  const patch = await req.json();
  const { data, error } = await supabase
    .from("comments")
    .update(patch)
    .eq("id", params.commentId)
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data);
}

export async function DELETE(_req: Request, { params }: P) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", params.commentId);
  if (error) return bad(error.message);
  return ok({ ok: true });
}
