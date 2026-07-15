import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateMonth } from "@/lib/generateMonth";
import { sendEmail, siteUrl } from "@/lib/email";
import { customerToken } from "@/lib/scheduleToken";

// Email sending can take a while with many customers.
export const maxDuration = 300;

// "YYYY-MM-DD" for today in the shop's timezone.
const todayCentral = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(
    new Date()
  );

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const firstOfNextMonth = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00Z");
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10);
};

const longDate = (dateStr) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateStr + "T00:00:00Z"));

const monthName = (dateStr) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateStr + "T00:00:00Z"));

const money = (cents) => `$${(cents / 100).toFixed(2)}`;

// One email per customer: invoice for the month that's ending (if they had
// completed visits) plus the schedule for next month (if they have bookings).
function monthlyEmailHtml({ firstName, invoice, schedule, link }) {
  const invoiceSection = invoice
    ? `
    <h3 style="margin:24px 0 8px;color:#B85C38;">Your ${invoice.month} invoice</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="text-align:left;color:#777;font-size:12px;text-transform:uppercase;">
          <th style="padding-bottom:6px;">Date</th>
          <th style="padding-bottom:6px;">Dog</th>
          <th style="padding-bottom:6px;">Service</th>
          <th style="padding-bottom:6px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lines
          .map(
            (l) => `
        <tr>
          <td style="padding:6px 12px 6px 0;border-bottom:1px solid #eee;">${longDate(l.date)}${
            l.endDate ? ` – ${longDate(l.endDate)}` : ""
          }</td>
          <td style="padding:6px 12px 6px 0;border-bottom:1px solid #eee;">${l.dog}</td>
          <td style="padding:6px 12px 6px 0;border-bottom:1px solid #eee;">${l.service}</td>
          <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${
            l.priceCents == null ? "—" : money(l.priceCents)
          }</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding-top:10px;font-weight:bold;">Total</td>
          <td style="padding-top:10px;font-weight:bold;text-align:right;">${money(invoice.totalCents)}</td>
        </tr>
      </tfoot>
    </table>
    <p style="font-size:13px;color:#777;">
      Per your payment authorization, this amount will be collected from your
      bank account on file.
    </p>`
    : "";

  const scheduleSection = schedule
    ? `
    <h3 style="margin:24px 0 8px;color:#B85C38;">${schedule.month} grooming days</h3>
    ${Object.entries(schedule.dogs)
      .map(
        ([dogName, visits]) => `
        <h4 style="margin:12px 0 4px;color:#2C7A7B;">${dogName}</h4>
        <ul style="margin:4px 0;padding-left:20px;">
          ${visits
            .map(
              (v) =>
                `<li>${longDate(v.date)}${
                  v.endDate ? ` – ${longDate(v.endDate)}` : ""
                } — ${v.service}</li>`
            )
            .join("")}
        </ul>`
      )
      .join("")}
    <p style="margin:24px 0;">
      <a href="${link}"
         style="background:#B85C38;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">
        View, change, or cancel appointments
      </a>
    </p>
    <p style="font-size:13px;color:#777;">
      Need a different day? Use the link above to cancel a visit or request a
      new date — date changes are confirmed by our team before they're final.
    </p>`
    : "";

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#333;">
    <h2 style="color:#B85C38;">Austin Paw Patrol</h2>
    <p>Hi ${firstName},</p>
    ${invoiceSection}
    ${scheduleSection}
    <p style="font-size:13px;color:#777;">Questions? Just reply to this email.</p>
  </div>`;
}

function subjectFor({ invoice, schedule }) {
  if (invoice && schedule) {
    return `Austin Paw Patrol: your ${invoice.month} invoice & ${schedule.month} schedule`;
  }
  if (invoice) return `Your Austin Paw Patrol invoice for ${invoice.month}`;
  return `Your Austin Paw Patrol grooming days for ${schedule.month}`;
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Test mode (?test=1): run now regardless of the date, but deliver every
  // email to the shop's own inbox instead of customers.
  const test = request.nextUrl.searchParams.get("test") === "1";

  // Runs every day; only act on the last day of the month (Central time).
  const today = todayCentral();
  const tomorrow = addDays(today, 1);
  if (!test && !tomorrow.endsWith("-01")) {
    return NextResponse.json({ ok: true, skipped: "not the last day of the month" });
  }

  // 1. Generate next month's bookings from recurring schedules.
  const generated = await generateMonth(firstOfNextMonth(today));
  if (generated.error) {
    return NextResponse.json({ error: generated.error }, { status: 500 });
  }

  // 2. Next month's scheduled bookings and the ending month's completed
  //    visits, both grouped per customer.
  const invoiceStart = `${today.slice(0, 7)}-01`;
  const [upcomingRes, doneRes] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select(
        `id, service_date, end_date,
         dogs ( name, customers ( id, first_name, email ) ),
         services ( name )`
      )
      .gte("service_date", generated.periodStart)
      .lte("service_date", generated.periodEnd)
      .eq("status", "scheduled")
      .order("service_date", { ascending: true }),
    supabaseAdmin
      .from("bookings")
      .select(
        `id, service_date, end_date, price_cents,
         dogs ( name, customers ( id, first_name, email ) ),
         services ( name )`
      )
      .gte("service_date", invoiceStart)
      .lte("service_date", today)
      .in("status", ["completed", "dropped_off"])
      .order("service_date", { ascending: true }),
  ]);

  if (upcomingRes.error || doneRes.error) {
    return NextResponse.json(
      { error: (upcomingRes.error || doneRes.error).message },
      { status: 500 }
    );
  }

  const scheduleMonth = monthName(generated.periodStart);
  const invoiceMonth = monthName(invoiceStart);

  // customer id -> { customer, invoice?, schedule? }
  const byCustomer = new Map();
  const entryFor = (customer) => {
    let entry = byCustomer.get(customer.id);
    if (!entry) {
      entry = { customer, invoice: null, schedule: null };
      byCustomer.set(customer.id, entry);
    }
    return entry;
  };

  for (const b of doneRes.data ?? []) {
    const customer = b.dogs?.customers;
    if (!customer?.email) continue;
    const entry = entryFor(customer);
    entry.invoice ??= { month: invoiceMonth, lines: [], totalCents: 0 };
    const nights = b.end_date
      ? Math.round(
          (new Date(b.end_date + "T00:00:00Z") -
            new Date(b.service_date + "T00:00:00Z")) /
            86400000
        )
      : 0;
    entry.invoice.lines.push({
      date: b.service_date,
      endDate: b.end_date,
      dog: b.dogs?.name ?? "Your dog",
      service:
        (b.services?.name ?? "Grooming") +
        (nights > 0 ? ` (${nights} night${nights === 1 ? "" : "s"})` : ""),
      priceCents: b.price_cents,
    });
    entry.invoice.totalCents += b.price_cents ?? 0;
  }

  for (const b of upcomingRes.data ?? []) {
    const customer = b.dogs?.customers;
    if (!customer?.email) continue;
    const entry = entryFor(customer);
    entry.schedule ??= { month: scheduleMonth, dogs: {} };
    const dogName = b.dogs?.name ?? "Your dog";
    (entry.schedule.dogs[dogName] ??= []).push({
      date: b.service_date,
      endDate: b.end_date,
      service: b.services?.name ?? "Grooming",
    });
  }

  // 3. One email per customer.
  let sent = 0;
  const failures = [];
  for (const { customer, invoice, schedule } of byCustomer.values()) {
    const subject = subjectFor({ invoice, schedule });
    try {
      await sendEmail({
        to: test ? process.env.YAHOO_USER : customer.email,
        subject: test
          ? `[TEST — would go to ${customer.email}] ${subject}`
          : subject,
        html: monthlyEmailHtml({
          firstName: customer.first_name,
          invoice,
          schedule,
          link: `${siteUrl()}/my-schedule/${customerToken(customer.id)}`,
        }),
      });
      sent++;
    } catch (e) {
      failures.push({ email: customer.email, error: e.message });
    }
  }

  return NextResponse.json({
    ok: true,
    test,
    generated,
    customers: byCustomer.size,
    sent,
    failures,
  });
}
