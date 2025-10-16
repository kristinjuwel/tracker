// app/api/tags/route.ts
import { createClient } from "@/lib/supabase/server";
import { ok, bad } from "@/utils/api";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").select("*").order("name");
  if (error) return bad(error.message);
  return ok(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  if (!body?.name) return bad("name is required");
  const { data, error } = await supabase
    .from("tags")
    .insert({ name: body.name })
    .select()
    .single();
  if (error) return bad(error.message);
  return ok(data, 201);
}
