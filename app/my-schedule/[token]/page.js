import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyCustomerToken } from "@/lib/scheduleToken";
import AppointmentRow from "./AppointmentRow";

export const dynamic = "force-dynamic";

const longDate = (dateStr) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateStr + "T00:00:00Z"));

export default async function MySchedulePage({ params }) {
  const { token } = await params;
  const customerId = verifyCustomerToken(token);

  if (!customerId) {
    return (
      <Shell>
        <p className="text-gray-600">
          This link isn't valid. Please use the link from your most recent
          Austin Paw Patrol email, or contact us for help.
        </p>
      </Shell>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const [customerRes, bookingsRes] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("first_name")
      .eq("id", customerId)
      .maybeSingle(),
    supabaseAdmin
      .from("bookings")
      .select(
        `id, service_date, status,
         dogs!inner ( name, customer_id ),
         services ( name )`
      )
      .eq("dogs.customer_id", customerId)
      .gte("service_date", today)
      .in("status", ["scheduled", "pending"])
      .order("service_date", { ascending: true }),
  ]);

  if (!customerRes.data) {
    return (
      <Shell>
        <p className="text-gray-600">
          This link isn't valid. Please contact us for help.
        </p>
      </Shell>
    );
  }

  const bookings = bookingsRes.data ?? [];

  return (
    <Shell>
      <p className="text-gray-700">
        Hi {customerRes.data.first_name}! Here are your upcoming grooming
        visits. You can cancel a visit or request a different date — date
        changes are confirmed by our team before they're final.
      </p>

      {bookings.length === 0 ? (
        <p className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          No upcoming appointments on the books.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {bookings.map((b) => (
            <AppointmentRow
              key={b.id}
              token={token}
              booking={{
                id: b.id,
                status: b.status,
                dateLabel: longDate(b.service_date),
                dog: b.dogs?.name ?? "Your dog",
                service: b.services?.name ?? "Grooming",
              }}
            />
          ))}
        </ul>
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-[#B85C38]">
        Austin Paw Patrol
      </h1>
      <h2 className="mt-1 text-sm font-medium uppercase tracking-wide text-gray-400">
        My schedule
      </h2>
      <div className="mt-6">{children}</div>
    </main>
  );
}
