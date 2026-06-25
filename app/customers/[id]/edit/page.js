import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PageHeader, ErrorNote } from "@/app/_components/ui";
import EditCustomerForm from "./EditCustomerForm";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }) {
  const { id } = await params;

  const [customerRes, neighborhoodsRes] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("*, dogs ( id, name, breed, size, weight_lb, vaccination_expiry, active )")
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
      <div className="max-w-2xl">
        <EditCustomerForm
          customer={customer}
          neighborhoods={neighborhoodsRes.data ?? []}
        />
      </div>
    </div>
  );
}
