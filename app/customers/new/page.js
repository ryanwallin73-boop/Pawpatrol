import { PageHeader } from "@/app/_components/ui";
import CustomerForm from "@/app/_components/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div>
      <PageHeader
        title="Add Customer"
        subtitle="Enter a customer's details"
      />
      <div className="max-w-2xl">
        <CustomerForm variant="staff" submitUrl="/api/customers" />
      </div>
    </div>
  );
}
