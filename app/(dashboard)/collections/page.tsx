import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CollectionsClient } from "@/components/collections-client";

export default async function CollectionsPage() {
  noStore();

  const supabase = await createClient();
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Tune these as you wish (kept small to avoid timeouts)
  const OWNED_LIMIT = 60;
  const MEMBER_IDS_LIMIT = 120;
  const MEMBER_DETAILS_LIMIT = 180;

  // --- Owned: get IDs first (no ORDER BY -> fast index-only) ---
  const ownedIdsRes = await supabase
    .from("collections")
    .select("id")
    .eq("created_by", user.id)
    .limit(OWNED_LIMIT);

  if (ownedIdsRes.error) {
    throw new Error(
      `Failed to load owned collections (ids): ${ownedIdsRes.error.message}`
    );
  }

  const ownedIds = (ownedIdsRes.data ?? []).map((r) => r.id);
  let ownedDetails: {
    id: string;
    title: string;
    description: string | null;
    image: string | null;
    created_at: string;
  }[] = [];

  if (ownedIds.length) {
    const ownedDetailsRes = await supabase
      .from("collections")
      .select("id, title, description, image, created_at")
      .in("id", ownedIds)
      .limit(OWNED_LIMIT);

    if (ownedDetailsRes.error) {
      throw new Error(
        `Failed to load owned collections (details): ${ownedDetailsRes.error.message}`
      );
    }
    ownedDetails = ownedDetailsRes.data ?? [];
  }

  // --- Member: first get col_ids from user_collections (cheap filter on user_id) ---
  const memberIdsRes = await supabase
    .from("user_collections")
    .select("col_id")
    .eq("user_id", user.id)
    .limit(MEMBER_IDS_LIMIT);

  if (memberIdsRes.error) {
    // Non-fatal: continue with owned only
    // (If you prefer, you can throw here too)
  }

  const memberColIds = (memberIdsRes.data ?? [])
    .map((r) => r.col_id)
    .filter(Boolean)
    // de-dup any overlap with owned
    .filter((id) => !ownedIds.includes(id));

  let memberDetails: typeof ownedDetails = [];
  if (memberColIds.length) {
    const memberDetailsRes = await supabase
      .from("collections")
      .select("id, title, description, image, created_at")
      .in("id", memberColIds)
      .limit(MEMBER_DETAILS_LIMIT);

    if (!memberDetailsRes.error) {
      memberDetails = memberDetailsRes.data ?? [];
    }
  }

  // Merge + sort client-side by created_at desc
  const merged = [...ownedDetails, ...memberDetails].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return <CollectionsClient initialCollections={merged} userId={user.id} />;
}
