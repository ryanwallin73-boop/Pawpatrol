import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PageHeader, Card, Empty, ErrorNote } from "@/app/_components/ui";
import HistoryRow from "./HistoryRow";

export const dynamic = "force-dynamic";

const money = (cents) => `$${(cents / 100).toFixed(2)}`;

// "YYYY-MM" shifted by n months.
const shiftMonth = (month, n) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

const monthLabel = (month) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(month + "-01T00:00:00Z"));

const nightsBetween = (start, end) =>
  Math.round(
    (new Date(end + "T00:00:00Z") - new Date(start + "T00:00:00Z")) / 86400000
  );

export default async function CustomerHistoryPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const thisMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  })
    .format(new Date())
    .slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(query?.month ?? "") ? query.month : thisMonth;
  const dogFilter = query?.dog ?? "";

  const monthStart = `${month}-01`;
  const monthEnd = `${shiftMonth(month, 1)}-01`; // exclusive

  const customerRes = await supabaseAdmin
    .from("customers")
    .select("id, first_name, last_name, dogs ( id, name, active )")
    .eq("id", id)
    .single();

  if (customerRes.error) {
    return (
      <div>
        <PageHeader title="History" />
        <ErrorNote error={customerRes.error} />
      </div>
    );
  }

  const customer = customerRes.data;
  const dogs = [...(customer.dogs ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const dogIds = dogFilter ? [dogFilter] : dogs.map((d) => d.id);

  // Anything that starts in the month, plus boarding stays that started
  // earlier and run into it.
  const bookingsRes =
    dogIds.length === 0
      ? { data: [], error: null }
      : await supabaseAdmin
          .from("bookings")
          .select(
            `id, service_date, end_date, status, price_cents, notes,
             dogs ( name ),
             services ( name )`
          )
          .in("dog_id", dogIds)
          .lt("service_date", monthEnd)
          .or(`service_date.gte.${monthStart},end_date.gte.${monthStart}`)
          .order("service_date", { ascending: true });

  const href = (m, d) =>
    `/customers/${id}/history?month=${m}${d ? `&dog=${d}` : ""}`;

  const bookings = bookingsRes.data ?? [];
  const active = bookings.filter((b) => b.status !== "canceled");
  const daycareDays = active.filter((b) => !b.end_date).length;
  const boardingNights = active
    .filter((b) => b.end_date)
    .reduce((n, b) => n + nightsBetween(b.service_date, b.end_date), 0);
  const totalCents = active.reduce((n, b) => n + (b.price_cents ?? 0), 0);

  const selectedDog = dogs.find((d) => d.id === dogFilter);

  return (
    <div>
      <PageHeader
        title={
          selectedDog
            ? `${selectedDog.name}'s History`
            : `${customer.first_name} ${customer.last_name}`
        }
        subtitle={
          selectedDog
            ? `${customer.first_name} ${customer.last_name}`
            : "Bookings by month. Change dates or cancel a day below."
        }
        action={
          <span className="flex items-center gap-4">
            <Link
              href={`/customers/${id}/edit`}
              className="text-sm font-medium text-[#2C7A7B] hover:underline"
            >
              Edit customer
            </Link>
            <Link
              href={`/bookings/new${dogFilter ? `?dog=${dogFilter}` : ""}`}
              className="inline-block rounded-lg bg-[#B85C38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a04e2e]"
            >
              + New booking
            </Link>
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm font-medium">
        <Link href={href(shiftMonth(month, -1), dogFilter)} className="text-[#2C7A7B] hover:underline">
          ← Previous month
        </Link>
        <span className="text-lg font-semibold text-gray-800">{monthLabel(month)}</span>
        <Link href={href(shiftMonth(month, 1), dogFilter)} className="text-[#2C7A7B] hover:underline">
          Next month →
        </Link>
        {month !== thisMonth ? (
          <Link href={href(thisMonth, dogFilter)} className="text-[#2C7A7B] hover:underline">
            This month
          </Link>
        ) : null}
      </div>

      {dogs.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {[{ id: "", name: "All dogs" }, ...dogs].map((d) => (
            <Link
              key={d.id}
              href={href(month, d.id)}
              className={`rounded-full px-3 py-1 font-medium ${
                d.id === dogFilter
                  ? "bg-[#2C7A7B] text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {d.name}
            </Link>
          ))}
        </div>
      ) : null}

      {bookingsRes.error ? (
        <ErrorNote error={bookingsRes.error} />
      ) : (
        <Card>
          {bookings.length === 0 ? (
            <Empty>No bookings in {monthLabel(month)}.</Empty>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-600">
                {daycareDays} daycare day{daycareDays === 1 ? "" : "s"} ·{" "}
                {boardingNights} boarding night{boardingNights === 1 ? "" : "s"} ·{" "}
                {money(totalCents)} (not counting canceled)
              </p>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Dog</th>
                    <th className="pb-2">Service</th>
                    <th className="pb-2">Price</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((b) => (
                    <HistoryRow key={b.id} booking={b} />
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
