// app/api/profiles/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { first_name, last_name, avatar_url } = body;

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: first_name ?? null,
      last_name: last_name ?? null,
      avatar_url: avatar_url ?? null, // <-- persist in DB
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
