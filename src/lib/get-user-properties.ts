import type { SupabaseClient } from "@supabase/supabase-js"

/** Returns property IDs the user owns/has access to via property_owners table. */
export async function getUserPropertyIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("property_owners")
    .select("property_id")
    .eq("user_id", userId)
  return data?.map((o: { property_id: string }) => o.property_id) ?? []
}
