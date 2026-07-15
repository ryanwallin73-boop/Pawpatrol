import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PageHeader, Card, Empty, ErrorNote } from "@/app/_components/ui";
import SettleButton from "./SettleButton";

export const dynamic = "force-dynamic";

const money = (cents) => `$${((cents ?? 0) / 100).toFixed(2)}`;

const monthLabel = (monthStart) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(monthStart + "T00:00:00Z"));

// "YYYY-MM" shifted by n months.
const shiftMonth = (month, n) => {
  const d = new Date(month + "-01T00:00:00Z");
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))
    .toISOString()
    .slice(0, 7);
};

export default async function BillingPage({ searchParams }) {
  const params = await searchParams;
  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  })
    .format(new Date())
    .slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(params?.month ?? "")
    ? params.month
    : currentMonth;

  const monthStart = `${month}-01`;
  const d = new Date(monthStart + "T00:00:00Z");
  const monthEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);

  const [bookingsRes, settlementsRes] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select(
        `id, price_cents,
         dogs ( customers ( id, first_name, last_name ) )`
      )
      .gte("service_date", monthStart)
      .lte("service_date", monthEnd)
      .in("status", ["completed", "dropped_off"]),
    supabaseAdmin
      .from("payment_settlements")
      .select("customer_id, amount_cents, method, settled_at")
      .eq("month_start", monthStart),
  ]);

  const error = bookingsRes.error || settlementsRes.error;

  const settledBy = new Map(
    (settlementsRes.data ?? []).map((s) => [s.customer_id, s])
  );

  // Group owed amounts per customer.
  const byCustomer = new Map();
  for (const b of bookingsRes.data ?? []) {
    const customer = b.dogs?.customers;
    if (!customer) continue;
    let row = byCustomer.get(customer.id);
    if (!row) {
      row = { customer, visits: 0, owedCents: 0 };
      byCustomer.set(customer.id, row);
    }
    row.visits += 1;
    row.owedCents += b.price_cents ?? 0;
  }

  const rows = [...byCustomer.values()].sort((a, b) =>
    `${a.customer.last_name} ${a.customer.first_name}`.localeCompare(
      `${b.customer.last_name} ${b.customer.first_name}`
    )
  );

  const totalOwed = rows.reduce((sum, r) => sum + r.owedCents, 0);
  const totalSettled = rows.reduce(
    (sum, r) => (settledBy.has(r.customer.id) ? sum + r.owedCents : sum),
    0
  );

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="What each customer owes for the month, and whether their payment (ACH or Venmo) has settled."
      />
      <div className="mb-4 flex items-center gap-4 text-sm font-medium">
        <Link
          href={`/billing?month=${shiftMonth(month, -1)}`}
          className="text-[#2C7A7B] hover:underline"
        >
          ← {monthLabel(shiftMonth(month, -1) + "-01")}
        </Link>
        <span className="text-lg font-semibold text-gray-800">
          {monthLabel(monthStart)}
        </span>
        <Link
          href={`/billing?month=${shiftMonth(month, 1)}`}
          className="text-[#2C7A7B] hover:underline"
        >
          {monthLabel(shiftMonth(month, 1) + "-01")} →
        </Link>
      </div>

      {error ? (
        <ErrorNote error={error} />
      ) : (
        <Card title={`Completed services in ${monthLabel(monthStart)}`}>
          {rows.length === 0 ? (
            <Empty>No completed services this month yet.</Empty>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Visits</th>
                  <th className="pb-2">Owes</th>
                  <th className="pb-2">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(({ customer, visits, owedCents }) => (
                  <tr key={customer.id}>
                    <td className="py-2 font-medium">
                      {customer.first_name} {customer.last_name}
                    </td>
                    <td className="py-2 text-gray-600">{visits}</td>
                    <td className="py-2">{money(owedCents)}</td>
                    <td className="py-2">
                      <SettleButton
                        customerId={customer.id}
                        monthStart={monthStart}
                        amountCents={owedCents}
                        settlement={settledBy.get(customer.id) ?? null}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-semibold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-gray-600">
                    {rows.reduce((sum, r) => sum + r.visits, 0)}
                  </td>
                  <td className="py-2">{money(totalOwed)}</td>
                  <td className="py-2 text-gray-600">
                    {money(totalSettled)} settled
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
