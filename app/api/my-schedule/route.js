import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyCustomerToken } from "@/lib/scheduleToken";
import { findVacation } from "@/lib/vacations";
import { sendEmail, siteUrl } from "@/lib/email";

export async function POST(request) {
  const { token, booking_id, action, new_date } = await request.json();

  const customerId = verifyCustomerToken(token);
  if (!customerId) {
    return NextResponse.json({ error: "Invalid link." }, { status: 401 });
  }

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, status, service_date, dog_id, dogs ( customer_id, name, customers ( first_name, last_name ) )"
    )
    .eq("id", booking_id)
    .maybeSingle();

  if (!booking || booking.dogs?.customer_id !== customerId) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }
  if (!["scheduled", "pending"].includes(booking.status)) {
    return NextResponse.json(
      { error: "This appointment can no longer be changed online. Please contact us." },
      { status: 400 }
    );
  }

  if (action === "cancel") {
    await supabaseAdmin.from("route_stops").delete().eq("booking_id", booking.id);
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ status: "canceled", van_id: null })
      .eq("id", booking.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "move") {
    const today = new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(new_date ?? "") || new_date <= today) {
      return NextResponse.json(
        { error: "Please pick a future date." },
        { status: 400 }
      );
    }

    const vacation = await findVacation(booking.dog_id, new_date);
    if (vacation) {
      return NextResponse.json(
        {
          error: `${booking.dogs?.name ?? "Your dog"} is marked away ${vacation.start_date} to ${vacation.end_date}. Please pick another date.`,
        },
        { status: 409 }
      );
    }

    // The booking may be on a route for its old date; unassign it. The new
    // date is pending until staff confirm it.
    await supabaseAdmin.from("route_stops").delete().eq("booking_id", booking.id);
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ service_date: new_date, status: "pending", van_id: null })
      .eq("id", booking.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Let staff know there's a request waiting; don't fail the customer's
    // request if the notification email can't be sent.
    const owner = booking.dogs?.customers;
    const ownerName = owner
      ? `${owner.first_name} ${owner.last_name}`
      : "A customer";
    try {
      await sendEmail({
        to: process.env.YAHOO_USER,
        subject: `Date change request: ${booking.dogs?.name ?? "a dog"} → ${new_date}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#333;">
            <p>${ownerName} requested a new date for
               <strong>${booking.dogs?.name ?? "their dog"}</strong>:</p>
            <p><strong>${booking.service_date}</strong> &rarr; <strong>${new_date}</strong></p>
            <p>The booking is marked <strong>pending</strong>. To confirm it,
               set its status back to Scheduled in
               <a href="${siteUrl()}/tracking">Daily Tracking</a>.</p>
          </div>`,
      });
    } catch {}

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
