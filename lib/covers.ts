import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** cover_url holds a storage path (or an already-absolute URL). Sign on read. */
export async function coverUrl(supabase: Client, value: string | null): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  const { data } = await supabase.storage.from("content").createSignedUrl(value, 3600);
  return data?.signedUrl ?? null;
}
