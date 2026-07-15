import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { findVacation } from "@/lib/vacations";

export async function POST(request) {
  const { dog_id, service_id, service_date, end_date, van_id, notes } =
    await request.json();

  if (!dog_id || !service_id || !service_date) {
    return NextResponse.json(
      { error: "Dog, service, and date are required." },
      { status: 400 }
    );
  }

  const vacation = await findVacation(dog_id, service_date);
  if (vacation) {
    return NextResponse.json(
      {
        error: `${vacation.dogName} is on vacation ${vacation.start_date} to ${vacation.end_date}.`,
      },
      { status: 409 }
    );
  }

  // Snapshot the service's current price into the booking.
  const { data: service, error: svcError } = await supabaseAdmin
    .from("services")
    .select("name, price_cents")
    .eq("id", service_id)
    .single();

  if (svcError) {
    return NextResponse.json({ error: svcError.message }, { status: 400 });
  }

  // Boarding is priced per night: check-out minus check-in.
  const isBoarding = (service.name ?? "").toLowerCase().includes("boarding");
  let priceCents = service.price_cents;
  if (isBoarding) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end_date ?? "") || end_date <= service_date) {
      return NextResponse.json(
        { error: "Boarding needs a check-out date after the check-in date (at least one night)." },
        { status: 400 }
      );
    }
    const nights = Math.round(
      (new Date(end_date + "T00:00:00Z") - new Date(service_date + "T00:00:00Z")) /
        86400000
    );
    priceCents = service.price_cents == null ? null : service.price_cents * nights;
  }

  const row = {
    dog_id,
    service_id,
    service_date,
    van_id: van_id || null,
    price_cents: priceCents,
    notes: notes || null,
  };
  // Only boarding rows carry an end date.
  if (isBoarding) row.end_date = end_date;

  const { error } = await supabaseAdmin.from("bookings").insert(row);

  if (error) {
    // Unique violation on (dog_id, service_id, service_date).
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That dog is already booked for this service on this date." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
