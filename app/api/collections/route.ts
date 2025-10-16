// app/api/collections/route.ts

import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*, user_collections(role)")
    .order("created_at", { ascending: false });
  if (error) return bad(error.message);
  return ok(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  if (!body?.title) return bad("title is required");
  const payload = {
    title: body.title,
    description: body.description ?? null,
    image: body.image ?? null,
    created_by: (await supabase.auth.getUser()).data.user?.id, // RLS will verify
  };
  const { data, error } = await supabase
    .from("collections")
    .insert(payload)
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data, 201);
}
