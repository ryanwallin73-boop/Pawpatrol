import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  PageHeader,
  Card,
  Empty,
  ErrorNote,
  Badge,
  NewBookingButton,
} from "@/app/_components/ui";
import BookingActions from "./BookingActions";

export const dynamic = "force-dynamic";

const dogOwner = (dog) =>
  dog?.customers ? `${dog.customers.first_name} ${dog.customers.last_name}` : "—";

export default async function SchedulesPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [bookings, vacations] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select(
        `id, service_date, status,
         dogs ( name, customers ( first_name, last_name ) ),
         services ( name ),
         vans ( name )`
      )
      .gte("service_date", today)
      .neq("status", "canceled")
      .order("service_date", { ascending: true })
      .limit(100),
    supabaseAdmin
      .from("vacation_days")
      .select(
        `id, start_date, end_date, reason,
         dogs ( name ),
         customers ( first_name, last_name )`
      )
      .gte("end_date", today)
      .order("start_date", { ascending: true }),
  ]);

  const error = bookings.error || vacations.error;

  return (
    <div>
      <PageHeader
        title="Schedules"
        subtitle="Upcoming bookings and vacation days."
        action={<NewBookingButton />}
      />
      {error ? (
        <ErrorNote error={error} />
      ) : (
        <div className="space-y-6">
          <Card title="Upcoming bookings">
            {bookings.data.length === 0 ? (
              <Empty>No upcoming bookings.</Empty>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Dog</th>
                    <th className="pb-2">Owner</th>
                    <th className="pb-2">Service</th>
                    <th className="pb-2">Van</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.data.map((b) => (
                    <tr key={b.id}>
                      <td className="py-2 font-medium">{b.service_date}</td>
                      <td className="py-2">{b.dogs?.name ?? "—"}</td>
                      <td className="py-2 text-gray-600">{dogOwner(b.dogs)}</td>
                      <td className="py-2">{b.services?.name ?? "—"}</td>
                      <td className="py-2 text-gray-600">{b.vans?.name ?? "—"}</td>
                      <td className="py-2">
                        <Badge status={b.status} />
                      </td>
                      <td className="py-2">
                        <BookingActions id={b.id} serviceDate={b.service_date} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Vacation days (current & upcoming)">
            {vacations.data.length === 0 ? (
              <Empty>No vacation days on record.</Empty>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="pb-2">From</th>
                    <th className="pb-2">To</th>
                    <th className="pb-2">Applies to</th>
                    <th className="pb-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vacations.data.map((v) => (
                    <tr key={v.id}>
                      <td className="py-2 font-medium">{v.start_date}</td>
                      <td className="py-2">{v.end_date}</td>
                      <td className="py-2 text-gray-600">
                        {v.dogs?.name
                          ? `Dog: ${v.dogs.name}`
                          : v.customers
                            ? `Household: ${v.customers.first_name} ${v.customers.last_name}`
                            : "—"}
                      </td>
                      <td className="py-2 text-gray-600">{v.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
