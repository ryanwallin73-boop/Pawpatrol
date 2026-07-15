import Link from "next/link";

export function NewBookingButton() {
  return (
    <Link
      href="/bookings/new"
      className="inline-block rounded-lg bg-[#B85C38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a04e2e]"
    >
      + New booking
    </Link>
  );
}

export function AddCustomerButton() {
  return (
    <Link
      href="/customers/new"
      className="inline-block rounded-lg bg-[#B85C38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a04e2e]"
    >
      + Add customer
    </Link>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-[#B85C38]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-gray-600">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {title ? (
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </h2>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Empty({ children }) {
  return <p className="text-sm text-gray-400">{children}</p>;
}

export function ErrorNote({ error }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      Couldn&apos;t load data: {error.message}
    </div>
  );
}

const statusColors = {
  // bookings
  scheduled: "bg-gray-100 text-gray-700",
  picked_up: "bg-amber-100 text-amber-800",
  in_service: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  dropped_off: "bg-emerald-100 text-emerald-800",
  canceled: "bg-red-100 text-red-700",
  no_show: "bg-red-100 text-red-700",
  // route stops + customer-requested booking changes
  pending: "bg-purple-100 text-purple-800",
  arrived: "bg-blue-100 text-blue-800",
  done: "bg-emerald-100 text-emerald-800",
  skipped: "bg-red-100 text-red-700",
  // payment methods
  verified: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-700",
  revoked: "bg-red-100 text-red-700",
};

export function Badge({ status }) {
  const cls = statusColors[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const weekdayName = (n) => WEEKDAYS[n] ?? `Day ${n}`;
