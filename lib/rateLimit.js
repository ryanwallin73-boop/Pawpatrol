import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Per-IP rate limit backed by the signup_attempts table. Returns
// { ok: true } when under the limit (and records the attempt), or
// { ok: false } when the IP has hit the limit in the window.
export async function checkRateLimit(
  ip,
  { limit = 5, windowMs = 60 * 60 * 1000 } = {}
) {
  // Can't identify the caller — don't block (rare; avoids false lockouts).
  if (!ip) return { ok: true };

  const since = new Date(Date.now() - windowMs).toISOString();

  // Drop this IP's expired rows, then count what's left in the window.
  await supabaseAdmin
    .from("signup_attempts")
    .delete()
    .eq("ip", ip)
    .lt("created_at", since);

  const { count, error } = await supabaseAdmin
    .from("signup_attempts")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);

  // On a counting error, fail open rather than lock out real customers.
  if (error) return { ok: true };

  if ((count ?? 0) >= limit) return { ok: false };

  await supabaseAdmin.from("signup_attempts").insert({ ip });
  return { ok: true };
}

export function clientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || null;
}
