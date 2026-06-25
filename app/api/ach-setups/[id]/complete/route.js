import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(_request, { params }) {
  const { id } = await params;

  // Look up the linked payment method before deleting the pending row.
  const { data: pending, error: lookupError } = await supabaseAdmin
    .from("pending_ach_setups")
    .select("payment_method_id")
    .eq("id", id)
    .single();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 404 });
  }

  // Mark the payment method verified now that it's set up in the bank.
  if (pending.payment_method_id) {
    const { error: pmError } = await supabaseAdmin
      .from("payment_methods")
      .update({ status: "verified" })
      .eq("id", pending.payment_method_id);
    if (pmError) {
      return NextResponse.json({ error: pmError.message }, { status: 500 });
    }
  }

  // Purge the full numbers.
  const { error: deleteError } = await supabaseAdmin
    .from("pending_ach_setups")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
