// app/api/tasks/tags/[tagId]/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

type P = { params: { tagId: string } };

// DELETE ?task_id=uuid
export async function DELETE(req: Request, { params }: P) {
  const supabase = await createClient();
  const task_id = new URL(req.url).searchParams.get("task_id");
  if (!task_id) return bad("task_id is required");
  const { error } = await supabase.from("task_tags").delete().match({
    task_id,
    tag_id: params.tagId,
  });
  if (error) return bad(error.message);
  return ok({ ok: true });
}
