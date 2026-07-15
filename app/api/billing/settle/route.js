import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const METHODS = ["ach", "venmo"];

export async function POST(request) {
  const { customer_id, month_start, amount_cents, settled, method, note } =
    await request.json();

  if (!customer_id || !/^\d{4}-\d{2}-01$/.test(month_start ?? "")) {
    return NextResponse.json(
      { error: "Customer and month are required." },
      { status: 400 }
    );
  }

  if (settled) {
    if (!METHODS.includes(method)) {
      return NextResponse.json(
        { error: "Payment method must be ACH or Venmo." },
        { status: 400 }
      );
    }
    const { error } = await supabaseAdmin.from("payment_settlements").upsert(
      {
        customer_id,
        month_start,
        amount_cents: amount_cents ?? null,
        method,
        note: (note ?? "").trim() || null,
        settled_at: new Date().toISOString(),
      },
      { onConflict: "customer_id,month_start" }
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin
      .from("payment_settlements")
      .delete()
      .eq("customer_id", customer_id)
      .eq("month_start", month_start);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
