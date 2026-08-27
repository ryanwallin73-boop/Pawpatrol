import { NextResponse } from "next/server";
import { generateNachaFile } from "@/lib/nacha";
import { uploadAchFile } from "@/lib/bocBank";

// One-entry ACH test upload against the bank's DEV server, run from the
// billing page. Staff-only (enforced by the auth middleware, since this route
// is not under /api/cron).
//
// The single entry debits the sandbox account in ACH_TEST_ROUTING /
// ACH_TEST_ACCOUNT — never a real customer's bank details. Wiring the real
// entries to the monthly invoice totals comes after this round trip works.

// Next weekday. The full federal-holiday calendar comes with the real wiring;
// for a dev-server test the bank only needs a plausible effective date.
function nextWeekday(from) {
  const d = new Date(from);
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const amountCents = Number.isInteger(body?.amountCents)
    ? body.amountCents
    : 100;

  const {
    ACH_ODFI_ROUTING,
    ACH_ODFI_BANK_NAME,
    ACH_COMPANY_NAME,
    ACH_COMPANY_ID,
    ACH_ENTRY_DESCRIPTION,
    ACH_TEST_ROUTING,
    ACH_TEST_ACCOUNT,
    ACH_TEST_NAME,
  } = process.env;

  const missing = Object.entries({
    ACH_ODFI_ROUTING,
    ACH_ODFI_BANK_NAME,
    ACH_COMPANY_NAME,
    ACH_COMPANY_ID,
    ACH_ENTRY_DESCRIPTION,
    ACH_TEST_ROUTING,
    ACH_TEST_ACCOUNT,
    ACH_TEST_NAME,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    return NextResponse.json(
      { error: `Missing env vars: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const today = new Date();
  const effectiveDate = nextWeekday(today);

  let nacha;
  try {
    nacha = generateNachaFile(
      {
        odfiBankRoutingNumber: ACH_ODFI_ROUTING,
        odfiBankName: ACH_ODFI_BANK_NAME,
        companyName: ACH_COMPANY_NAME,
        companyId: ACH_COMPANY_ID,
        entryDescription: ACH_ENTRY_DESCRIPTION,
        effectiveDate,
      },
      [
        {
          rdfiRoutingNumber: ACH_TEST_ROUTING,
          rdfiAccountNumber: ACH_TEST_ACCOUNT,
          amountCents,
          individualId: "TEST",
          individualName: ACH_TEST_NAME,
          transactionCode: "27",
        },
      ]
    );
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // File name doubles as the bank's duplicate key, so include the clock time.
  const stamp = today.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const fileName = `pawpatrol_test_${stamp}.ach`;

  try {
    const bank = await uploadAchFile(nacha.content, fileName);
    return NextResponse.json({
      ok: true,
      fileName,
      effectiveDate: effectiveDate.toISOString().slice(0, 10),
      entryCount: nacha.entryCount,
      totalDebitCents: nacha.totalDebitCents,
      bank,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message, fileName }, { status: 502 });
  }
}
