import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  const { dog_id, service_id, weekday } = await request.json();
  const wd = Number(weekday);

  if (!dog_id || !service_id || Number.isNaN(wd) || wd < 0 || wd > 6) {
    return NextResponse.json(
      { error: "Dog, service, and weekday are required." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("recurring_schedules")
    .insert({ dog_id, service_id, weekday: wd, active: true });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That dog already has this service on that weekday." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
