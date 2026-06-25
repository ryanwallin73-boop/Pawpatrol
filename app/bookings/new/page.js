import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PageHeader, ErrorNote } from "@/app/_components/ui";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const [dogsRes, servicesRes, vansRes] = await Promise.all([
    supabaseAdmin
      .from("dogs")
      .select("id, name, customers ( first_name, last_name )")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("services")
      .select("id, name, price_cents")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("vans")
      .select("id, name")
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  const error = dogsRes.error || servicesRes.error || vansRes.error;

  return (
    <div>
      <PageHeader title="New Booking" subtitle="Schedule a dog for a service." />
      {error ? (
        <ErrorNote error={error} />
      ) : (
        <BookingForm
          dogs={dogsRes.data}
          services={servicesRes.data}
          vans={vansRes.data}
        />
      )}
    </div>
  );
}
