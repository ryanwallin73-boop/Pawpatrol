import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PageHeader, ErrorNote, Badge } from "@/app/_components/ui";
import EditCustomerForm from "./EditCustomerForm";
import AddAchForm from "./AddAchForm";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }) {
  const { id } = await params;

  const [customerRes, neighborhoodsRes] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select(
        "*, dogs ( id, name, breed, size, weight_lb, vaccination_expiry, active ), payment_methods ( id, method_type, status, account_last4, is_default )"
      )
      .eq("id", id)
      .single(),
    supabaseAdmin
      .from("neighborhoods")
      .select("id, name")
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  if (customerRes.error) {
    return (
      <div>
        <PageHeader title="Edit Customer" />
        <ErrorNote error={customerRes.error} />
      </div>
    );
  }

  const customer = customerRes.data;

  return (
    <div>
      <PageHeader
        title="Edit Customer"
        subtitle={`${customer.first_name} ${customer.last_name}`}
      />
      <div className="max-w-2xl space-y-6">
        <EditCustomerForm
          customer={customer}
          neighborhoods={neighborhoodsRes.data ?? []}
        />
        {(customer.payment_methods ?? []).length === 0 ? (
          <AddAchForm customerId={customer.id} />
        ) : (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Payment methods
            </h2>
            <ul className="space-y-1 text-sm">
              {customer.payment_methods.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-gray-700">
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
          </section>
        )}
      </div>
    </div>
  );
}
