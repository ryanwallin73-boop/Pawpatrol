import { NextResponse } from "next/server";
import { createCustomerWithAch } from "@/lib/createCustomer";
import { ACH_CONSENT_TEXT } from "@/lib/ach";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const MIN_FILL_MS = 2500;

export async function POST(request) {
  const { customer, dogs, bank, hp, elapsedMs } = await request.json();

  // Honeypot: real users never fill the hidden field. Pretend success so
  // bots don't learn they were caught.
  if (hp) return NextResponse.json({ ok: true });

  // Timing: a form filled out faster than a human could is almost certainly a bot.
  if (typeof elapsedMs === "number" && elapsedMs < MIN_FILL_MS) {
    return NextResponse.json({ ok: true });
  }

  // Per-IP flood protection.
  const rl = await checkRateLimit(clientIp(request));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many signups from your network. Please try again later." },
      { status: 429 }
    );
  }

  const result = await createCustomerWithAch({
    customer,
    dogs,
    bank,
    consentText: ACH_CONSENT_TEXT,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
