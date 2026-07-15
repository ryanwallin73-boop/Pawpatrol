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

function scheduleEmailHtml({ firstName, dogs, month, link }) {
  const dogSections = Object.entries(dogs)
    .map(
      ([dogName, visits]) => `
        <h3 style="margin:16px 0 4px;color:#2C7A7B;">${dogName}</h3>
        <ul style="margin:4px 0;padding-left:20px;">
          ${visits
            .map((v) => `<li>${longDate(v.date)} — ${v.service}</li>`)
            .join("")}
        </ul>`
    )
    .join("");

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#333;">
    <h2 style="color:#B85C38;">Paw Patrol Mobile Grooming</h2>
    <p>Hi ${firstName},</p>
    <p>Here's when we'll see your pup${
      Object.keys(dogs).length > 1 ? "s" : ""
    } in ${month}:</p>
    ${dogSections}
    <p style="margin:24px 0;">
      <a href="${link}"
         style="background:#B85C38;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">
        View, change, or cancel appointments
      </a>
    </p>
    <p style="font-size:13px;color:#777;">
      Need a different day? Use the link above to cancel a visit or request a
      new date — date changes are confirmed by our team before they're final.
    </p>
  </div>`;
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Runs every day; only act on the last day of the month (Central time).
  const today = todayCentral();
  const tomorrow = addDays(today, 1);
  if (!tomorrow.endsWith("-01")) {
    return NextResponse.json({ ok: true, skipped: "not the last day of the month" });
  }

  // 1. Generate next month's bookings from recurring schedules.
  const generated = await generateMonth(tomorrow);
  if (generated.error) {
    return NextResponse.json({ error: generated.error }, { status: 500 });
  }

  // 2. Collect next month's scheduled bookings, grouped by customer.
  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select(
      `id, service_date,
       dogs ( name, customers ( id, first_name, email ) ),
       services ( name )`
    )
    .gte("service_date", generated.periodStart)
    .lte("service_date", generated.periodEnd)
    .eq("status", "scheduled")
    .order("service_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byCustomer = new Map();
  for (const b of bookings ?? []) {
    const customer = b.dogs?.customers;
    if (!customer?.email) continue;
    let entry = byCustomer.get(customer.id);
    if (!entry) {
      entry = { customer, dogs: {} };
      byCustomer.set(customer.id, entry);
    }
    const dogName = b.dogs?.name ?? "Your dog";
    (entry.dogs[dogName] ??= []).push({
      date: b.service_date,
      service: b.services?.name ?? "Grooming",
    });
  }

  // 3. Email each customer their month at a glance.
  const month = monthName(generated.periodStart);
  let sent = 0;
  const failures = [];
  for (const { customer, dogs } of byCustomer.values()) {
    try {
      await sendEmail({
        to: customer.email,
        subject: `Your Paw Patrol grooming days for ${month}`,
        html: scheduleEmailHtml({
          firstName: customer.first_name,
          dogs,
          month,
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
    generated,
    customers: byCustomer.size,
    sent,
    failures,
  });
}
