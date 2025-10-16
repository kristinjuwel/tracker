// app/api/tasks/dependencies/[depId]/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

type P = { params: { depId: string } };

export async function DELETE(_req: Request, { params }: P) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_dependencies")
    .delete()
    .eq("id", params.depId);
  if (error) return bad(error.message);
  return ok({ ok: true });
}
