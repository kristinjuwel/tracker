// app/api/collections/members/[userId]/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

type RouteContext = { params: Promise<{ userId: string }> };

// DELETE ?col_id=uuid
export async function DELETE(req: Request, context: RouteContext) {
  const { userId } = await context.params;
  const supabase = await createClient();
  const col_id = new URL(req.url).searchParams.get("col_id");
  if (!col_id) return bad("col_id is required");
  const { error } = await supabase.from("user_collections").delete().match({
    col_id,
    user_id: userId,
  });
  if (error) return bad(error.message);
  return ok({ ok: true });
}
