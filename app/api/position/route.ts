import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Remember where the reader left off, per text. The client beacons a fraction of
// the way through the body on scroll; restoring it on open is what makes a
// device feel like it keeps your place.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const contentItemId = body.content_item_id as string | undefined;
  const fraction = typeof body.fraction === "number" ? body.fraction : null;
  if (!contentItemId || fraction == null) return new Response("Missing fields", { status: 400 });

  const now = new Date().toISOString();
  const { data: u } = await supabase
    .from("usage")
    .select("id, counters")
    .eq("user_id", auth.user.id)
    .eq("content_item_id", contentItemId)
    .maybeSingle();
  const counters = { ...((u?.counters ?? {}) as Record<string, unknown>), lastFraction: fraction };
  if (u) await supabase.from("usage").update({ counters, last_position: now }).eq("id", u.id);
  else
    await supabase
      .from("usage")
      .insert({ user_id: auth.user.id, content_item_id: contentItemId, counters, last_position: now });

  return new Response("ok");
}
