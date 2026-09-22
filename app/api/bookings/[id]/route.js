import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { findVacation } from "@/lib/vacations";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { service_date, end_date } = await request.json();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(service_date ?? "")) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const { data: booking, error: lookupError } = await supabaseAdmin
    .from("bookings")
    .select("dog_id, service_date, end_date, price_cents")
    .eq("id", id)
    .single();
  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 404 });
  }

  const update = { service_date };

  // Boarding: a new check-out date re-prices the stay at its existing
  // nightly rate (so any per-night discount carries over).
  if (booking.end_date && end_date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end_date ?? "") || end_date <= service_date) {
      return NextResponse.json(
        { error: "Check-out must be after check-in (at least one night)." },
        { status: 400 }
      );
    }
    const nights = (a, b) =>
      Math.round(
        (new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000
      );
    update.end_date = end_date;
    if (booking.price_cents != null) {
      const nightly = Math.round(
        booking.price_cents / nights(booking.service_date, booking.end_date)
      );
      update.price_cents = nightly * nights(service_date, end_date);
    }
  }

  const vacation = await findVacation(booking.dog_id, service_date);
  if (vacation) {
    return NextResponse.json(
      {
        error: `${vacation.dogName} is on vacation ${vacation.start_date} to ${vacation.end_date}.`,
      },
      { status: 409 }
    );
  }

  // The booking may be on a route for its old date; unassign it.
  if (service_date !== booking.service_date) {
    await supabaseAdmin.from("route_stops").delete().eq("booking_id", id);
    update.van_id = null;
  }

  const { error } = await supabaseAdmin
    .from("bookings")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request, { params }) {
  const { id } = await params;

  await supabaseAdmin.from("route_stops").delete().eq("booking_id", id);

  const { error } = await supabaseAdmin.from("bookings").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
