import { NextResponse } from "next/server";
import { createCustomerWithAch } from "@/lib/createCustomer";
import { ACH_CONSENT_TEXT } from "@/lib/ach";

export async function POST(request) {
  const { customer, dogs, bank, authorized, authNote } = await request.json();

  if (!authorized) {
    return NextResponse.json(
      { error: "Confirm the customer authorized these ACH debits." },
      { status: 400 }
    );
  }

  let consentText =
    ACH_CONSENT_TEXT + " — Recorded by staff on the customer's behalf.";
  if (authNote?.trim()) {
    consentText += ` Authorization received: ${authNote.trim()}.`;
  }

  const result = await createCustomerWithAch({
    customer,
    dogs,
    bank,
    consentText,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
