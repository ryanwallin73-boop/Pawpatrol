import { NextResponse } from "next/server";
import { syncAchStatuses } from "@/lib/achPayments";

// The bank's status for recent ACH files, run from the billing page. Also
// records each payment's status and marks settled months paid. Staff-only
// (enforced by the auth middleware, since this route is not under /api/cron).
export async function GET() {
  try {
    const files = await syncAchStatuses();
    return NextResponse.json({ ok: true, files });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
