import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Every day in the calendar month containing `dateStr`, with its weekday
// (matches schema weekday: 0=Sun .. 6=Sat).
function monthDays(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const x = new Date(Date.UTC(year, month, i));
    days.push({ date: x.toISOString().slice(0, 10), weekday: x.getUTCDay() });
  }
  return days;
}

// Create bookings from active recurring schedules for the calendar month
// containing `dateStr`, skipping vacation days and existing bookings.
export async function generateMonth(dateStr) {
  const days = monthDays(dateStr);
  const periodStart = days[0].date;
  const periodEnd = days[days.length - 1].date;

  const [rulesRes, vacationsRes] = await Promise.all([
    supabaseAdmin
      .from("recurring_schedules")
      .select("dog_id, service_id, weekday, dogs ( customer_id ), services ( price_cents )")
      .eq("active", true),
    supabaseAdmin
      .from("vacation_days")
      .select("dog_id, customer_id, start_date, end_date")
      .lte("start_date", periodEnd)
      .gte("end_date", periodStart),
  ]);

  if (rulesRes.error || vacationsRes.error) {
    return { error: (rulesRes.error || vacationsRes.error).message };
  }

  const vacations = vacationsRes.data ?? [];
  const onVacation = (dogId, customerId, dateStr) =>
    vacations.some(
      (v) =>
        (v.dog_id === dogId ||
          (v.customer_id && v.customer_id === customerId)) &&
        v.start_date <= dateStr &&
        v.end_date >= dateStr
    );

  const rows = [];
  let skippedVacation = 0;
  for (const day of days) {
    for (const rule of rulesRes.data ?? []) {
      if (rule.weekday !== day.weekday) continue;
      const customerId = rule.dogs?.customer_id;
      if (onVacation(rule.dog_id, customerId, day.date)) {
        skippedVacation++;
        continue;
      }
      rows.push({
        dog_id: rule.dog_id,
        service_id: rule.service_id,
        service_date: day.date,
        price_cents: rule.services?.price_cents ?? null,
        status: "scheduled",
      });
    }
  }

  let created = 0;
  if (rows.length > 0) {
    // Upsert ignoring existing (dog, service, date) rows; select returns only inserts.
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .upsert(rows, {
        onConflict: "dog_id,service_id,service_date",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      return { error: error.message };
    }
    created = data?.length ?? 0;
  }

  return {
    created,
    skippedExisting: rows.length - created,
    skippedVacation,
    periodStart,
    periodEnd,
  };
}
