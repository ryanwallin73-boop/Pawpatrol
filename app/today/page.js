import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PageHeader, Card, Empty, ErrorNote, Badge } from "@/app/_components/ui";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const { data: rows, error } = await supabaseAdmin
    .from("todays_routes")
    .select("*");

  // The view is already ordered by van then stop_order; group by van for display.
  const byVan = {};
  for (const row of rows ?? []) {
    (byVan[row.van_name] ??= []).push(row);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Today's Routes"
        subtitle={`Every stop scheduled for ${today}, ordered by van.`}
      />
      {error ? (
        <ErrorNote error={error} />
      ) : Object.keys(byVan).length === 0 ? (
        <Card>
          <Empty>No stops scheduled for today.</Empty>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(byVan).map(([van, stops]) => (
            <Card key={van} title={`${van}${stops[0].neighborhood ? ` · ${stops[0].neighborhood}` : ""}`}>
              <table className="w-full text-left text-sm">
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
                  {stops.map((s, i) => (
                    <tr key={i}>
                      <td className="py-2 font-medium">{s.stop_order}</td>
                      <td className="py-2 text-gray-600">
                        {s.eta ? s.eta.slice(0, 5) : "—"}
                      </td>
                      <td className="py-2">{s.customer ?? "—"}</td>
                      <td className="py-2">{s.dog ?? "—"}</td>
                      <td className="py-2">{s.service ?? "—"}</td>
                      <td className="py-2">
                        <Badge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
