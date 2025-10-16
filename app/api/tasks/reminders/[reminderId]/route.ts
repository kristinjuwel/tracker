// app/api/tasks/reminders/[reminderId]/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

type P = { params: { reminderId: string } };

export async function PATCH(req: Request, { params }: P) {
  const supabase = await createClient();
  const patch = await req.json();
  const { data, error } = await supabase
    .from("reminders")
    .update(patch)
    .eq("id", params.reminderId)
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data);
}

export async function DELETE(_req: Request, { params }: P) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", params.reminderId);
  if (error) return bad(error.message);
  return ok({ ok: true });
}
