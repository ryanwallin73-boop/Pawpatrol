import { createBrowserClient } from "@supabase/ssr";

// Cookie-based client for use in client components (login, sign-out).
// Uses the public anon key, so RLS applies to whatever the signed-in user can see.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
