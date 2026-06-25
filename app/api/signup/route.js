import { NextResponse } from "next/server";
import { createCustomerWithAch } from "@/lib/createCustomer";
import { ACH_CONSENT_TEXT } from "@/lib/ach";

export async function POST(request) {
  const { customer, dogs, bank } = await request.json();

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
