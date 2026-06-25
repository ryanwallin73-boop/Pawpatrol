import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request, { params }) {
  const { id } = await params;
  const { direction } = await request.json();

  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "Invalid direction." }, { status: 400 });
  }

  const { data: stop, error: stopError } = await supabaseAdmin
    .from("route_stops")
    .select("id, route_id, stop_order")
    .eq("id", id)
    .single();

  if (stopError) {
    return NextResponse.json({ error: stopError.message }, { status: 404 });
  }

  // Find the adjacent stop in the same route to swap order with.
  let query = supabaseAdmin
    .from("route_stops")
    .select("id, stop_order")
    .eq("route_id", stop.route_id);
  query =
    direction === "up"
      ? query.lt("stop_order", stop.stop_order).order("stop_order", { ascending: false })
      : query.gt("stop_order", stop.stop_order).order("stop_order", { ascending: true });

  const { data: neighbor } = await query.limit(1).maybeSingle();

  // Already at the end/start — nothing to do.
  if (!neighbor) return NextResponse.json({ ok: true });

  await supabaseAdmin
    .from("route_stops")
    .update({ stop_order: neighbor.stop_order })
    .eq("id", stop.id);
  await supabaseAdmin
    .from("route_stops")
    .update({ stop_order: stop.stop_order })
    .eq("id", neighbor.id);

  return NextResponse.json({ ok: true });
}
