import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  PageHeader,
  Card,
  Empty,
  ErrorNote,
  NewBookingButton,
} from "@/app/_components/ui";
import StatusSelect from "./StatusSelect";

export const dynamic = "force-dynamic";

const fmtTime = (ts) =>
  ts
    ? new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "—";

export default async function TrackingPage() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select(
      `id, status, picked_up_at, dropped_off_at,
       dogs ( name, customers ( first_name, last_name ) ),
       services ( name ),
       vans ( name )`
    )
    .eq("service_date", today)
    .order("created_at", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Daily Tracking"
        subtitle={`Update each dog's status through the day — ${today}.`}
        action={<NewBookingButton />}
      />
      {error ? (
        <ErrorNote error={error} />
      ) : bookings.length === 0 ? (
        <Card>
          <Empty>No bookings for today.</Empty>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="pb-2">Dog</th>
                <th className="pb-2">Owner</th>
                <th className="pb-2">Service</th>
                <th className="pb-2">Van</th>
                <th className="pb-2">Picked up</th>
                <th className="pb-2">Dropped off</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="py-2 font-medium">{b.dogs?.name ?? "—"}</td>
                  <td className="py-2 text-gray-600">
                    {b.dogs?.customers
                      ? `${b.dogs.customers.first_name} ${b.dogs.customers.last_name}`
                      : "—"}
                  </td>
                  <td className="py-2">{b.services?.name ?? "—"}</td>
                  <td className="py-2 text-gray-600">{b.vans?.name ?? "—"}</td>
                  <td className="py-2 text-gray-600">{fmtTime(b.picked_up_at)}</td>
                  <td className="py-2 text-gray-600">{fmtTime(b.dropped_off_at)}</td>
                  <td className="py-2">
                    <StatusSelect id={b.id} status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
