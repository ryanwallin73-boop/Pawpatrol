import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  const { dog_id, service_id, service_date, van_id, notes } =
    await request.json();

  if (!dog_id || !service_id || !service_date) {
    return NextResponse.json(
      { error: "Dog, service, and date are required." },
      { status: 400 }
    );
  }

  // Snapshot the service's current price into the booking.
  const { data: service, error: svcError } = await supabaseAdmin
    .from("services")
    .select("price_cents")
    .eq("id", service_id)
    .single();

  if (svcError) {
    return NextResponse.json({ error: svcError.message }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("bookings").insert({
    dog_id,
    service_id,
    service_date,
    van_id: van_id || null,
    price_cents: service.price_cents,
    notes: notes || null,
  });

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
