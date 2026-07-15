import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { start_date, end_date } = await request.json();

  if (!DATE.test(start_date ?? "") || !DATE.test(end_date ?? "")) {
    return NextResponse.json({ error: "Invalid dates." }, { status: 400 });
  }
  if (end_date < start_date) {
    return NextResponse.json(
      { error: "End date must be on or after the start date." },
      { status: 400 }
    );
  }

  const { data: vacation, error: lookupError } = await supabaseAdmin
    .from("vacation_days")
    .select("dog_id, customer_id")
    .eq("id", id)
    .single();
  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("vacation_days")
    .update({ start_date, end_date })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cancel scheduled bookings inside the new range, like adding a vacation does.
  const dogIds = vacation.dog_id
    ? [vacation.dog_id]
    : vacation.customer_id
      ? (
          (
            await supabaseAdmin
              .from("dogs")
              .select("id")
              .eq("customer_id", vacation.customer_id)
          ).data ?? []
        ).map((d) => d.id)
      : [];

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

export async function DELETE(_request, { params }) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("vacation_days")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
