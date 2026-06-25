"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const field =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B]";
const label = "block text-sm font-medium text-gray-700";

const WEEKDAYS = [
  ["1", "Monday"],
  ["2", "Tuesday"],
  ["3", "Wednesday"],
  ["4", "Thursday"],
  ["5", "Friday"],
  ["6", "Saturday"],
  ["0", "Sunday"],
];

const ownerName = (dog) =>
  dog.customers
    ? `${dog.customers.first_name} ${dog.customers.last_name}`
    : "Unknown owner";

export default function RecurringForm({ dogs, services }) {
  const router = useRouter();
  const [form, setForm] = useState({ dog_id: "", service_id: "", weekday: "4" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setError(error || "Couldn't add the schedule.");
      return;
    }
    setForm({ ...form, dog_id: "" });
    router.refresh();
  }

  if (dogs.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        No dogs on file yet. Add a customer and dog first.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-4"
    >
      <div className="sm:col-span-2">
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
        <select className={field} required value={form.service_id} onChange={set("service_id")}>
          <option value="">Select…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label}>Weekday</label>
        <select className={field} value={form.weekday} onChange={set("weekday")}>
          {WEEKDAYS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="sm:col-span-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="sm:col-span-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#B85C38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a04e2e] disabled:opacity-60"
        >
          {loading ? "Adding…" : "Add recurring schedule"}
        </button>
      </div>
    </form>
  );
}
