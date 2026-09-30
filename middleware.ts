import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Decode the access token's expiry without a network call. The session only
// needs refreshing when the token is about to expire — hitting auth on every
// request added a full round trip to every navigation.
function expiringSoon(request: NextRequest): boolean {
  const cookie = request.cookies.getAll().find((c) => c.name.endsWith("-auth-token"));
  if (!cookie) return false;
  try {
    const parsed = JSON.parse(cookie.value);
    const entry = Array.isArray(parsed) ? parsed[0] : parsed;
    const access = entry?.access_token;
    if (!access) return true;
    const part = access.split(".")[1];
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64));
    return typeof payload.exp !== "number" || payload.exp - Date.now() / 1000 < 300;
  } catch {
    return true; // unreadable — refresh to be safe
  }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!expiringSoon(request)) return supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
