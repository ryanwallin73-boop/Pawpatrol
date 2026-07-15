import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED = [
  "scheduled",
  "pending",
  "picked_up",
  "in_service",
  "completed",
  "dropped_off",
  "canceled",
  "no_show",
];

export async function POST(request, { params }) {
  const { id } = await params;
  const { status } = await request.json();

  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  // Fetch current timestamps so we only stamp them once.
  const { data: current, error: lookupError } = await supabaseAdmin
    .from("bookings")
    .select("picked_up_at, dropped_off_at")
    .eq("id", id)
    .single();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 404 });
  }

  const update = { status };
  const now = new Date().toISOString();
  if (status === "picked_up" && !current.picked_up_at) update.picked_up_at = now;
  if (status === "dropped_off" && !current.dropped_off_at)
    update.dropped_off_at = now;

  const { error } = await supabaseAdmin
    .from("bookings")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
