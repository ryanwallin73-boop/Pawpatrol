"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const field =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B]";
const label = "block text-sm font-medium text-gray-700";

const money = (cents) =>
  typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "";

const ownerName = (dog) =>
  dog.customers
    ? `${dog.customers.first_name} ${dog.customers.last_name}`
    : "Unknown owner";

export default function BookingForm({ dogs, services, vans }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    dog_id: "",
    service_id: "",
    service_date: today,
    van_id: "",
    notes: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setError(error || "Couldn't create the booking.");
      setLoading(false);
      return;
    }
    setDone(true);
  }

  if (dogs.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        No dogs on file yet. Add a customer and dog first (via the{" "}
        <Link href="/signup" className="font-medium underline">
          signup form
        </Link>
        ), then come back to create a booking.
      </p>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="font-medium text-emerald-700">Booking created.</p>
        <div className="mt-4 flex gap-4 text-sm">
          <button
            onClick={() => {
              setDone(false);
              setForm({ ...form, dog_id: "", notes: "" });
            }}
            className="font-medium text-[#2C7A7B] hover:underline"
          >
            + Create another
          </button>
          <button
            onClick={() => router.push("/tracking")}
            className="font-medium text-[#B85C38] hover:underline"
          >
            Go to Daily Tracking
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className={label}>Dog</label>
        <select className={field} required value={form.dog_id} onChange={set("dog_id")}>
          <option value="">Select a dog…</option>
          {dogs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — {ownerName(d)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label}>Service</label>
        <select
          className={field}
          required
          value={form.service_id}
          onChange={set("service_id")}
        >
          <option value="">Select a service…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {money(s.price_cents) && `(${money(s.price_cents)})`}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Date</label>
          <input
            className={field}
            type="date"
            required
            value={form.service_date}
            onChange={set("service_date")}
          />
        </div>
        <div>
          <label className={label}>Van (optional)</label>
          <select className={field} value={form.van_id} onChange={set("van_id")}>
            <option value="">Unassigned</option>
            {vans.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Notes (optional)</label>
        <textarea className={field} rows={2} value={form.notes} onChange={set("notes")} />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[#B85C38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a04e2e] disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create booking"}
      </button>
    </form>
  );
}
