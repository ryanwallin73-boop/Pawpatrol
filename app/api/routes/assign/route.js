import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  const { date, van_id, booking_id } = await request.json();

  if (!date || !van_id || !booking_id) {
    return NextResponse.json(
      { error: "Date, van, and booking are required." },
      { status: 400 }
    );
  }

  // Get or create the route for this van + date.
  const { data: route, error: routeError } = await supabaseAdmin
    .from("routes")
    .upsert({ route_date: date, van_id }, { onConflict: "route_date,van_id" })
    .select("id")
    .single();

  if (routeError) {
    return NextResponse.json({ error: routeError.message }, { status: 500 });
  }

  // Append after the current last stop.
  const { data: last } = await supabaseAdmin
    .from("route_stops")
    .select("stop_order")
    .eq("route_id", route.id)
    .order("stop_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (last?.stop_order ?? 0) + 1;

  const { error: stopError } = await supabaseAdmin.from("route_stops").insert({
    route_id: route.id,
    booking_id,
    stop_order: nextOrder,
    status: "pending",
  });

  if (stopError) {
    return NextResponse.json({ error: stopError.message }, { status: 500 });
  }

  // Keep the booking's van in sync so other screens show it.
  await supabaseAdmin.from("bookings").update({ van_id }).eq("id", booking_id);

  return NextResponse.json({ ok: true });
}
