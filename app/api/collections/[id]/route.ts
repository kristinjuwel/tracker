import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

type P = { params: { id: string } };

export async function GET(_req: Request, { params }: P) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error) return bad(error.message, 404);
  return ok(data);
}

export async function PATCH(req: Request, { params }: P) {
  const supabase = await createClient();
  const patch = await req.json();
  const { data, error } = await supabase
    .from("collections")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data);
}

export async function DELETE(_req: Request, { params }: P) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", params.id);
  if (error) return bad(error.message);
  return ok({ ok: true });
}
