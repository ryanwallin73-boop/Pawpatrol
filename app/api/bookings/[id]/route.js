import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { service_date } = await request.json();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(service_date ?? "")) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  // The booking may be on a route for its old date; unassign it.
  await supabaseAdmin.from("route_stops").delete().eq("booking_id", id);

  const { error } = await supabaseAdmin
    .from("bookings")
    .update({ service_date, van_id: null })
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
