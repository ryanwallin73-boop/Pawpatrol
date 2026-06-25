import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PageHeader, Card, Empty, ErrorNote, Badge } from "@/app/_components/ui";
import AssignRow from "./AssignRow";
import StopControls from "./StopControls";

export const dynamic = "force-dynamic";

const ownerOf = (dog) =>
  dog?.customers ? `${dog.customers.first_name} ${dog.customers.last_name}` : "—";

export default async function RouteBuilderPage({ searchParams }) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = sp?.date || today;

  const [vansRes, routesRes, bookingsRes, vacationsRes] = await Promise.all([
    supabaseAdmin
      .from("vans")
      .select("id, name")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("routes")
      .select(
        `id, van_id,
         vans ( name ),
         neighborhoods ( name ),
         route_stops (
           id, stop_order, status, booking_id,
           bookings ( dogs ( name, customers ( first_name, last_name ) ), services ( name ) )
         )`
      )
      .eq("route_date", date),
    supabaseAdmin
      .from("bookings")
      .select(
        `id, status,
         dogs ( id, name, customer_id, customers ( first_name, last_name ) ),
         services ( name )`
      )
      .eq("service_date", date)
      .not("status", "in", "(canceled,no_show)"),
    supabaseAdmin
      .from("vacation_days")
      .select("dog_id, customer_id")
      .lte("start_date", date)
      .gte("end_date", date),
  ]);

  const error =
    vansRes.error || routesRes.error || bookingsRes.error || vacationsRes.error;

  // Bookings already placed on a route for this date.
  const assignedBookingIds = new Set();
  for (const r of routesRes.data ?? []) {
    for (const s of r.route_stops ?? []) {
      if (s.booking_id) assignedBookingIds.add(s.booking_id);
    }
  }

  // Dogs / households on vacation this date.
  const vacationDogIds = new Set();
  const vacationCustomerIds = new Set();
  for (const v of vacationsRes.data ?? []) {
    if (v.dog_id) vacationDogIds.add(v.dog_id);
    if (v.customer_id) vacationCustomerIds.add(v.customer_id);
  }
  const onVacation = (dog) =>
    vacationDogIds.has(dog?.id) || vacationCustomerIds.has(dog?.customer_id);

  const bookings = bookingsRes.data ?? [];
  const unassigned = bookings.filter(
    (b) => !assignedBookingIds.has(b.id) && !onVacation(b.dogs)
  );
  const skipped = bookings.filter(
    (b) => !assignedBookingIds.has(b.id) && onVacation(b.dogs)
  );

  const routes = [...(routesRes.data ?? [])].sort((a, b) =>
    (a.vans?.name ?? "").localeCompare(b.vans?.name ?? "")
  );

  return (
    <div>
      <PageHeader
        title="Route Builder"
        subtitle="Assign the day's bookings to vans as ordered stops."
      />

      {error ? (
        <ErrorNote error={error} />
      ) : (
        <div className="space-y-6">
          <form method="get" className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                name="date"
                defaultValue={date}
                className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Go
            </button>
          </form>

          <Card title="Unassigned bookings">
            {vansRes.data.length === 0 ? (
              <Empty>No active vans.</Empty>
            ) : unassigned.length === 0 ? (
              <Empty>Nothing to assign for {date}.</Empty>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="pb-2">Dog</th>
                    <th className="pb-2">Owner</th>
                    <th className="pb-2">Service</th>
                    <th className="pb-2 text-right">Assign to van</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unassigned.map((b) => (
                    <AssignRow
                      key={b.id}
                      booking={b}
                      vans={vansRes.data}
                      date={date}
                    />
                  ))}
                </tbody>
              </table>
            )}
            {skipped.length > 0 ? (
              <p className="mt-3 text-xs text-gray-400">
                Skipped (on vacation): {skipped.map((b) => b.dogs?.name).join(", ")}
              </p>
            ) : null}
          </Card>

          {routes.length === 0 ? (
            <Card>
              <Empty>No routes built yet for {date}.</Empty>
            </Card>
          ) : (
            routes.map((r) => {
              const stops = [...(r.route_stops ?? [])].sort(
                (a, b) => a.stop_order - b.stop_order
              );
              return (
                <Card key={r.id} title={r.vans?.name ?? "Van"}>
                  {stops.length === 0 ? (
                    <Empty>No stops yet.</Empty>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-gray-400">
                        <tr>
                          <th className="pb-2 w-10">#</th>
                          <th className="pb-2">Dog</th>
                          <th className="pb-2">Owner</th>
                          <th className="pb-2">Service</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Order</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stops.map((s, i) => (
                          <tr key={s.id}>
                            <td className="py-2 font-medium">{i + 1}</td>
                            <td className="py-2">{s.bookings?.dogs?.name ?? "—"}</td>
                            <td className="py-2 text-gray-600">
                              {ownerOf(s.bookings?.dogs)}
                            </td>
                            <td className="py-2">{s.bookings?.services?.name ?? "—"}</td>
                            <td className="py-2">
                              <Badge status={s.status} />
                            </td>
                            <td className="py-2">
                              <StopControls id={s.id} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
