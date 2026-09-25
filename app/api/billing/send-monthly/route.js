import { NextResponse } from "next/server";
import { runMonthlyBilling } from "@/lib/monthlyBilling";

// Manual trigger for the monthly invoice + schedule emails, run from the
// billing page. Reachable only by a signed-in staff user (enforced by the
// auth middleware, since this route is not under /api/cron). With { test: true }
// every email goes to the shop's own inbox instead of to customers.
export const maxDuration = 300;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const test = body?.test === true;

  const result = await runMonthlyBilling({ test });
  if (result.alreadySent) {
    const { month, sentAt } = result.alreadySent;
    const when = sentAt
      ? " on " +
        new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/Chicago",
        })
          .format(new Date(sentAt))
          .replace(", ", " at ")
      : "";
    return NextResponse.json(
      { error: `${month} bills were already sent${when}.` },
      { status: 409 }
    );
  }
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, test, ...result });
}
