import { NextResponse } from "next/server";
import { addAchPaymentMethod } from "@/lib/createCustomer";
import { ACH_CONSENT_TEXT } from "@/lib/ach";

// Adds ACH details to an existing customer who was created without them.
export async function POST(request, { params }) {
  const { id } = await params;
  const { bank, authorized, authNote } = await request.json();

  if (!authorized) {
    return NextResponse.json(
      { error: "Confirm the customer authorized these ACH debits." },
      { status: 400 }
    );
  }
  if (!bank?.routing_number || !bank?.account_number) {
    return NextResponse.json(
      { error: "Bank routing and account numbers are required." },
      { status: 400 }
    );
  }

  let consentText =
    ACH_CONSENT_TEXT + " — Recorded by staff on the customer's behalf.";
  if (authNote?.trim()) {
    consentText += ` Authorization received: ${authNote.trim()}.`;
  }

  const result = await addAchPaymentMethod({
    customerId: id,
    bank,
    consentText,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
