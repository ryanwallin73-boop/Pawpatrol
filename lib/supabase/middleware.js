import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Refreshes the auth session on every request and gates access:
// any request without a signed-in user is redirected to /login.
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Routes reachable without a staff login: the login page, the
  // customer-facing signup form (+ its submit endpoint), the tokened
  // customer schedule page (+ its endpoint), and the cron endpoint
  // (which checks its own CRON_SECRET bearer token).
  const publicPrefixes = [
    "/login",
    "/signup",
    "/api/signup",
    "/my-schedule",
    "/api/my-schedule",
    "/api/cron",
  ];
  const isPublic = publicPrefixes.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
