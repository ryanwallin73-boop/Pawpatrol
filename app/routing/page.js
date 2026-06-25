import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PageHeader, Card, Empty, ErrorNote, Badge } from "@/app/_components/ui";

export const dynamic = "force-dynamic";

export default async function RoutingPage() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: routes, error } = await supabaseAdmin
    .from("routes")
    .select(
      `id, route_date,
       vans ( name ),
       neighborhoods ( name ),
       route_stops (
         id, stop_order, eta, status,
         customers ( first_name, last_name ),
         bookings ( dogs ( name, customers ( first_name, last_name ) ), services ( name ) )
       )`
    )
    .gte("route_date", today)
    .order("route_date", { ascending: true })
    .limit(50);

  const stopCustomer = (stop) => {
    if (stop.customers)
      return `${stop.customers.first_name} ${stop.customers.last_name}`;
    const c = stop.bookings?.dogs?.customers;
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  return (
    <div>
      <PageHeader
        title="Van Routing"
        subtitle="Daily routes per van and neighborhood, with their stops."
      />
      {error ? (
        <ErrorNote error={error} />
      ) : routes.length === 0 ? (
        <Card>
          <Empty>No routes scheduled.</Empty>
        </Card>
      ) : (
        <div className="space-y-4">
          {routes.map((r) => {
            const stops = [...r.route_stops].sort(
              (a, b) => a.stop_order - b.stop_order
            );
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {r.vans?.name ?? "Unassigned van"}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {r.route_date}
                    {r.neighborhoods?.name ? ` · ${r.neighborhoods.name}` : ""}
                  </span>
                </div>
                {stops.length === 0 ? (
                  <Empty>No stops on this route.</Empty>
                ) : (
                  <table className="mt-3 w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="pb-2 w-10">#</th>
                        <th className="pb-2">ETA</th>
                        <th className="pb-2">Customer</th>
                        <th className="pb-2">Dog</th>
                        <th className="pb-2">Service</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stops.map((s) => (
                        <tr key={s.id}>
                          <td className="py-2 font-medium">{s.stop_order}</td>
                          <td className="py-2 text-gray-600">
                            {s.eta ? s.eta.slice(0, 5) : "—"}
                          </td>
                          <td className="py-2">{stopCustomer(s)}</td>
                          <td className="py-2">{s.bookings?.dogs?.name ?? "—"}</td>
                          <td className="py-2">{s.bookings?.services?.name ?? "—"}</td>
                          <td className="py-2">
                            <Badge status={s.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
