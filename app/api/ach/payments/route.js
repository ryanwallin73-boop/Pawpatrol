import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { achChargePreview, sendAchPayments } from "@/lib/achPayments";

// Review and send the monthly ACH debits, run from the billing page.
// Staff-only (enforced by the auth middleware, since this route is not under
// /api/cron). Upload can be slow through the proxy.
export const maxDuration = 60;

// What would be charged now, plus the last 60 days of sent payments.
export async function GET() {
  const preview = await achChargePreview();
  if (preview.error) {
    return NextResponse.json({ error: preview.error }, { status: 500 });
  }

  const since = new Date(Date.now() - 60 * 86400000).toISOString();
  const { data: recent, error } = await supabaseAdmin
    .from("ach_payments")
    .select(
      "id, amount_cents, effective_date, file_id, status, status_detail, created_at, customers ( first_name, last_name )"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Never send account numbers to the browser — last 4 only.
  return NextResponse.json({
    effectiveDate: preview.effectiveDate,
    totalCents: preview.totalCents,
    charges: preview.charges.map((c) => ({
      customer: c.customer,
      amountCents: c.amountCents,
      bookings: c.bookingIds.length,
      accountLast4: c.method.account_last4,
      accountType: c.method.account_type,
    })),
    skipped: preview.skipped.map((s) => ({
      customer: s.customer,
      amountCents: s.amountCents,
    })),
    recent,
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const result = await sendAchPayments({
    count: body?.count,
    totalCents: body?.totalCents,
  });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json(result);
}
