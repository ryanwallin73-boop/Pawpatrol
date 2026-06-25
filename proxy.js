import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request) {
  return await updateSession(request);
}

export const config = {
  // Run on every route except Next internals and static image assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
