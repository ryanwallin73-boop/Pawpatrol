import { NextResponse } from "next/server";
import { runMonthlyBilling, todayCentral, addDays } from "@/lib/monthlyBilling";

// Email sending can take a while with many customers.
export const maxDuration = 300;

// Months (in "YYYY-MM") to skip the automatic month-end send for — the shop is
// sending those bills manually from the billing page instead. Automatic sends
// resume on their own for any month not listed here.
const SKIP_AUTO_MONTHS = ["2026-07"];

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Test mode (?test=1): run now regardless of the date, but deliver every
  // email to the shop's own inbox instead of customers.
  const test = request.nextUrl.searchParams.get("test") === "1";

  const today = todayCentral();

  // Automatic runs fire only on the last day of the month, and never for a
  // month we're sending manually. Test runs bypass both checks.
  if (!test) {
    const tomorrow = addDays(today, 1);
    if (!tomorrow.endsWith("-01")) {
      return NextResponse.json({
        ok: true,
        skipped: "not the last day of the month",
      });
    }
    if (SKIP_AUTO_MONTHS.includes(today.slice(0, 7))) {
      return NextResponse.json({
        ok: true,
        skipped: "sending manually this month",
      });
    }
  }

  const result = await runMonthlyBilling({ test });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, test, ...result });
}
