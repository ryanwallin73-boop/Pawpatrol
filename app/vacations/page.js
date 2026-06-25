import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PageHeader, Card, Empty, ErrorNote } from "@/app/_components/ui";
import VacationForm from "./VacationForm";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function VacationsPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [customersRes, vacationsRes] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("id, first_name, last_name, dogs ( id, name )")
      .order("last_name", { ascending: true }),
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

  const error = customersRes.error || vacationsRes.error;

  // Flat scope list: each household + each of its dogs.
  const scopeOptions = [];
  for (const c of customersRes.data ?? []) {
    const name = `${c.first_name} ${c.last_name}`;
    scopeOptions.push({
      value: `customer:${c.id}`,
      label: `${name} — entire household`,
    });
    for (const d of c.dogs ?? []) {
      scopeOptions.push({ value: `dog:${d.id}`, label: `${d.name} (${name})` });
    }
  }

  return (
    <div>
      <PageHeader
        title="Vacations"
        subtitle="Days to skip a dog or whole household when scheduling."
      />
      {error ? (
        <ErrorNote error={error} />
      ) : (
        <div className="space-y-6">
          <VacationForm scopeOptions={scopeOptions} />

          <Card title="Current & upcoming">
            {vacationsRes.data.length === 0 ? (
              <Empty>No vacation days scheduled.</Empty>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="pb-2">From</th>
                    <th className="pb-2">To</th>
                    <th className="pb-2">Applies to</th>
                    <th className="pb-2">Reason</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vacationsRes.data.map((v) => (
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
                      <td className="py-2 text-right">
                        <DeleteButton id={v.id} />
                      </td>
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
