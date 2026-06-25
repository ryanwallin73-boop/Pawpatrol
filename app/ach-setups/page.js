import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PageHeader, Card, Empty, ErrorNote } from "@/app/_components/ui";
import CompleteButton from "./CompleteButton";

export const dynamic = "force-dynamic";

export default async function AchSetupsPage() {
  const { data: pending, error } = await supabaseAdmin
    .from("pending_ach_setups")
    .select(
      `id, account_number, routing_number, created_at,
       customers ( first_name, last_name ),
       payment_methods ( bank_name, account_type )`
    )
    .order("created_at", { ascending: true });

  return (
    <div>
      <PageHeader
        title="ACH Setups"
        subtitle="Key these into the bank's payor system, then purge the numbers. They are not stored anywhere else."
      />
      {error ? (
        <ErrorNote error={error} />
      ) : pending.length === 0 ? (
        <Card>
          <Empty>No pending bank setups. 🎉</Empty>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {p.customers
                    ? `${p.customers.first_name} ${p.customers.last_name}`
                    : "Unknown customer"}
                </h3>
                <span className="text-sm text-gray-500">
                  {p.payment_methods?.bank_name ?? "—"} ·{" "}
                  {p.payment_methods?.account_type ?? "—"}
                </span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">
                    Routing number
                  </dt>
                  <dd className="font-mono text-base text-gray-900">
                    {p.routing_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">
                    Account number
                  </dt>
                  <dd className="font-mono text-base text-gray-900">
                    {p.account_number}
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <CompleteButton id={p.id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
