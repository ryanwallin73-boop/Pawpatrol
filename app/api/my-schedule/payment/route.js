import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyCustomerToken } from "@/lib/scheduleToken";
import { addAchPaymentMethod, deactivateAch } from "@/lib/createCustomer";
import { ACH_CONSENT_TEXT } from "@/lib/ach";
import { sendEmail, siteUrl } from "@/lib/email";

// Customer adds, replaces, or removes their ACH bank account from the
// tokened link in their invoice email.
export async function POST(request) {
  const { token, action, bank, authorized } = await request.json();

  const customerId = verifyCustomerToken(token);
  if (!customerId) {
    return NextResponse.json({ error: "Invalid link." }, { status: 401 });
  }

  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("first_name, last_name")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) {
    return NextResponse.json({ error: "Invalid link." }, { status: 401 });
  }
  const name = `${customer.first_name} ${customer.last_name}`;

  if (action === "remove") {
    const result = await deactivateAch(customerId);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    await notifyStaff(
      `ACH removed: ${name}`,
      `<p>${name} removed their bank account online. They won't be debited
       again until new bank details are added.</p>`
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "save") {
    if (!authorized) {
      return NextResponse.json(
        { error: "Please check the box to authorize ACH debits." },
        { status: 400 }
      );
    }
    if (!bank?.routing_number || !bank?.account_number) {
      return NextResponse.json(
        { error: "Bank routing and account numbers are required." },
        { status: 400 }
      );
    }

    // A newer submission replaces any staff haven't reviewed yet. An approved
    // account keeps being debited until this one is approved.
    const { error: pendingError } = await supabaseAdmin
      .from("pending_ach_setups")
      .delete()
      .eq("customer_id", customerId);
    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 });
    }
    const { error: revokeError } = await supabaseAdmin
      .from("payment_methods")
      .update({ status: "revoked", is_default: false, revoked_at: new Date().toISOString() })
      .eq("customer_id", customerId)
      .eq("method_type", "ach")
      .eq("status", "pending");
    if (revokeError) {
      return NextResponse.json({ error: revokeError.message }, { status: 500 });
    }

    const result = await addAchPaymentMethod({
      customerId,
      bank,
      consentText: ACH_CONSENT_TEXT + " — Submitted by the customer online.",
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    await notifyStaff(
      `New bank details: ${name}`,
      `<p>${name} entered new bank details online. Review them in
       <a href="${siteUrl()}/ach-setups">ACH Setups</a>.</p>`
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}

// Don't fail the customer's change if the email can't be sent.
async function notifyStaff(subject, body) {
  try {
    await sendEmail({
      to: process.env.YAHOO_USER,
      subject,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#333;">${body}</div>`,
    });
  } catch {}
}
