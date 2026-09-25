import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encryptAccount } from "@/lib/achCrypto";

// Approves a customer's bank details for monthly ACH debits.
export async function POST(_request, { params }) {
  const { id } = await params;

  const { data: pending, error: lookupError } = await supabaseAdmin
    .from("pending_ach_setups")
    .select("payment_method_id, account_number, routing_number")
    .eq("id", id)
    .single();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 404 });
  }
  if (!pending.payment_method_id) {
    return NextResponse.json(
      { error: "This setup isn't linked to a payment method." },
      { status: 409 }
    );
  }

  // Rows from before the app kept bank numbers still hold them in plain
  // text: move them onto the payment method, encrypted, before the row goes.
  const update = { status: "verified" };
  if (pending.account_number && pending.routing_number) {
    try {
      update.account_number_enc = encryptAccount(pending.account_number.trim());
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    update.routing_number = pending.routing_number.replace(/\D/g, "");
  }

  const { error: pmError } = await supabaseAdmin
    .from("payment_methods")
    .update(update)
    .eq("id", pending.payment_method_id);
  if (pmError) {
    return NextResponse.json({ error: pmError.message }, { status: 500 });
  }

  const { data: deleted, error: deleteError } = await supabaseAdmin
    .from("pending_ach_setups")
    .delete()
    .eq("id", id)
    .select("id");

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }
  if (!deleted?.length) {
    return NextResponse.json(
      { error: "Approved, but couldn't remove it from this list." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
