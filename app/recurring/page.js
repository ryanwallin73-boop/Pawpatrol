import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  PageHeader,
  Card,
  Empty,
  ErrorNote,
  weekdayName,
} from "@/app/_components/ui";
import RecurringForm from "./RecurringForm";
import GenerateForm from "./GenerateForm";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

const ownerOf = (dog) =>
  dog?.customers ? `${dog.customers.first_name} ${dog.customers.last_name}` : "—";

export default async function RecurringPage() {
  const [dogsRes, servicesRes, rulesRes] = await Promise.all([
    supabaseAdmin
      .from("dogs")
      .select("id, name, customers ( first_name, last_name )")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("services")
      .select("id, name")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("recurring_schedules")
      .select(
        `id, weekday,
         dogs ( name, customers ( first_name, last_name ) ),
         services ( name )`
      )
      .eq("active", true)
      .order("weekday", { ascending: true }),
  ]);

  const error = dogsRes.error || servicesRes.error || rulesRes.error;

  return (
    <div>
      <PageHeader
        title="Recurring Schedules"
        subtitle="Standing weekly schedules, and generating their bookings."
      />
      {error ? (
        <ErrorNote error={error} />
      ) : (
        <div className="space-y-6">
          <RecurringForm dogs={dogsRes.data} services={servicesRes.data} />

          <Card title="Active recurring schedules">
            {rulesRes.data.length === 0 ? (
              <Empty>No recurring schedules yet.</Empty>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="pb-2">Weekday</th>
                    <th className="pb-2">Dog</th>
                    <th className="pb-2">Owner</th>
                    <th className="pb-2">Service</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rulesRes.data.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 font-medium">{weekdayName(r.weekday)}</td>
                      <td className="py-2">{r.dogs?.name ?? "—"}</td>
                      <td className="py-2 text-gray-600">{ownerOf(r.dogs)}</td>
                      <td className="py-2">{r.services?.name ?? "—"}</td>
                      <td className="py-2 text-right">
                        <DeleteButton id={r.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Generate bookings
            </h2>
            <GenerateForm />
          </div>
        </div>
      )}
    </div>
  );
}
