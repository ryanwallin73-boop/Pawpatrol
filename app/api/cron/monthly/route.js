import { NextResponse } from "next/server";
import { addDays, todayCentral } from "@/lib/monthlyBilling";
import { sendEmail, siteUrl } from "@/lib/email";

const monthName = (dateStr) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(dateStr + "T00:00:00Z"));

// Bills and invoices are sent by hand from the billing page. This runs daily
// and, on the last day of the month, reminds the shop to confirm schedules and
// send them.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Test mode (?test=1): send now regardless of the date, to Katherine only.
  const test = request.nextUrl.searchParams.get("test") === "1";

  const today = todayCentral();
  if (!test && !addDays(today, 1).endsWith("-01")) {
    return NextResponse.json({
      ok: true,
      skipped: "not the last day of the month",
    });
  }

  const month = monthName(today);
  await sendEmail({
    to: test ? "katherine@agcenter.com" : process.env.YAHOO_USER,
    cc: test ? undefined : "katherine@agcenter.com",
    subject: `${test ? "[TEST] " : ""}Reminder: confirm ${month} schedules before sending invoices`,
    html: `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#000;">
      <p>Hi Brandy,</p>
      <p>Today is the last day of ${month}. Please confirm all schedules have been entered for the month.</p>
      <p>Nothing goes out automatically. When it's ready, on or after the 1st, send the invoices from the billing page:</p>
      <p style="margin:28px 0;">
        <a href="${siteUrl()}/billing"
           style="display:inline-block;background:#B85C38;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          Go to billing
        </a>
      </p>
    </div>`,
  });

  return NextResponse.json({ ok: true, test });
}
