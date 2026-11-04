import { NextResponse } from "next/server";
import { sendInvoicesOnly } from "@/lib/monthlyBilling";

// Manual invoice-only send from the billing page, for completed visits that
// missed the month's bills (e.g. attendance entered late). Reachable only by a
// signed-in staff user (enforced by the auth middleware). With { test: true }
// every email goes to the shop's own inbox instead of to customers.
export const maxDuration = 300;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const test = body?.test === true;

  const result = await sendInvoicesOnly({ test });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, test, ...result });
}
