import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(_request, { params }) {
  const { id } = await params;

  // Find the linked booking so we can mark it unassigned again.
  const { data: stop } = await supabaseAdmin
    .from("route_stops")
    .select("booking_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("route_stops")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (stop?.booking_id) {
    await supabaseAdmin
      .from("bookings")
      .update({ van_id: null })
      .eq("id", stop.booking_id);
  }

  return NextResponse.json({ ok: true });
}
