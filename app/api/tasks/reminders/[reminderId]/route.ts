// app/api/tasks/reminders/[reminderId]/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

type RouteContext = { params: Promise<{ reminderId: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const { reminderId } = await context.params;
  const supabase = await createClient();
  const patch = await req.json();
  const { data, error } = await supabase
    .from("reminders")
    .update(patch)
    .eq("id", reminderId)
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { reminderId } = await context.params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", reminderId);
  if (error) return bad(error.message);
  return ok({ ok: true });
}
