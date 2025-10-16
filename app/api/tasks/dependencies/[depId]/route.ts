// app/api/tasks/dependencies/[depId]/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

type RouteContext = { params: Promise<{ depId: string }> };

export async function DELETE(_req: Request, context: RouteContext) {
  const { depId } = await context.params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_dependencies")
    .delete()
    .eq("id", depId);
  if (error) return bad(error.message);
  return ok({ ok: true });
}
