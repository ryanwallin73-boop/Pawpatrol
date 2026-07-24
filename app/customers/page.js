import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  PageHeader,
  Card,
  Empty,
  ErrorNote,
  Badge,
  AddCustomerButton,
} from "@/app/_components/ui";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const { data: customers, error } = await supabaseAdmin
    .from("customers")
    .select(
      `id, first_name, last_name, email, phone, city, state,
       neighborhoods ( name ),
       dogs ( id, name, breed, active ),
       payment_methods ( method_type, status, account_last4, is_default )`
    )
    .order("last_name", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Households, their dogs, and payment methods on file."
        action={<AddCustomerButton />}
      />
      {error ? (
        <ErrorNote error={error} />
      ) : customers.length === 0 ? (
        <Card>
          <Empty>No customers yet.</Empty>
        </Card>
      ) : (
        <div className="space-y-4">
          {customers.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {c.first_name} {c.last_name}
                </h3>
                <span className="text-sm text-gray-500">
                  {c.neighborhoods?.name ?? "No neighborhood"}
                  <Link
                    href={`/customers/${c.id}/edit`}
                    className="ml-3 font-medium text-[#2C7A7B] hover:underline"
                  >
                    Edit
                  </Link>
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {c.email ?? "—"} · {c.phone ?? "—"}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Dogs
                  </h4>
                  {c.dogs.length === 0 ? (
                    <Empty>No dogs.</Empty>
                  ) : (
                    <ul className="mt-1 space-y-1 text-sm">
                      {c.dogs.map((d) => (
                        <li key={d.id} className="text-gray-700">
                          {d.name}
                          {d.breed ? (
                            <span className="text-gray-400"> · {d.breed}</span>
                          ) : null}
                          {!d.active ? (
                            <span className="text-gray-400"> (inactive)</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Payment Methods
                  </h4>
                  {c.payment_methods.length === 0 ? (
                    <Empty>None on file.</Empty>
                  ) : (
                    <ul className="mt-1 space-y-1 text-sm">
                      {c.payment_methods.map((p, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-700">
                          <span className="uppercase">{p.method_type}</span>
                          <span className="text-gray-400">
                            ••••{p.account_last4 ?? "????"}
                          </span>
                          <Badge status={p.status} />
                          {p.is_default ? (
                            <span className="text-xs text-[#2C7A7B]">default</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          ))}
          <p className="pt-2 text-center text-sm text-gray-500">
            {customers.length} customer{customers.length === 1 ? "" : "s"} total
          </p>
        </div>
      )}
    </div>
  );
}
