import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  const { scope, start_date, end_date, reason } = await request.json();

  if (!scope || !start_date || !end_date) {
    return NextResponse.json(
      { error: "Scope, start date, and end date are required." },
      { status: 400 }
    );
  }
  if (end_date < start_date) {
    return NextResponse.json(
      { error: "End date must be on or after the start date." },
      { status: 400 }
    );
  }

  // scope is "dog:<id>" (one dog) or "customer:<id>" (whole household).
  const [type, id] = scope.split(":");
  const row = { start_date, end_date, reason: reason || null };
  if (type === "dog") row.dog_id = id;
  else if (type === "customer") row.customer_id = id;
  else return NextResponse.json({ error: "Invalid scope." }, { status: 400 });

  const { error } = await supabaseAdmin.from("vacation_days").insert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cancel existing, not-yet-started bookings that fall inside the vacation.
  const dogIds =
    type === "dog"
      ? [id]
      : (
          (
            await supabaseAdmin
              .from("dogs")
              .select("id")
              .eq("customer_id", id)
          ).data ?? []
        ).map((d) => d.id);

  let canceled = 0;
  if (dogIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("bookings")
      .update({ status: "canceled" })
      .in("dog_id", dogIds)
      .gte("service_date", start_date)
      .lte("service_date", end_date)
      .eq("status", "scheduled")
      .select("id");
    canceled = data?.length ?? 0;
  }

  return NextResponse.json({ ok: true, canceled });
}
