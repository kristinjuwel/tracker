// app/api/tasks/assignees/[userId]/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

type RouteContext = { params: Promise<{ userId: string }> };

// DELETE ?task_id=uuid
export async function DELETE(req: Request, context: RouteContext) {
  const { userId } = await context.params;
  const supabase = await createClient();
  const task_id = new URL(req.url).searchParams.get("task_id");
  if (!task_id) return bad("task_id is required");
  const { error } = await supabase.from("user_tasks").delete().match({
    task_id,
    user_id: userId,
  });
  if (error) return bad(error.message);
  return ok({ ok: true });
}
