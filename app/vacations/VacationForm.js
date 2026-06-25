"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const field =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B]";
const label = "block text-sm font-medium text-gray-700";

export default function VacationForm({ scopeOptions }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    scope: "",
    start_date: today,
    end_date: today,
    reason: "",
  });
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNote(null);

    const res = await fetch("/api/vacations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Couldn't add the vacation.");
      return;
    }
    setNote(
      data.canceled > 0
        ? `Vacation added. Canceled ${data.canceled} existing booking${
            data.canceled === 1 ? "" : "s"
          } in that range.`
        : "Vacation added."
    );
    setForm({ ...form, scope: "", reason: "" });
    router.refresh();
  }

  if (scopeOptions.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        No customers on file yet. Add a customer first, then schedule their
        vacation days.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className={label}>Applies to</label>
        <select className={field} required value={form.scope} onChange={set("scope")}>
          <option value="">Select a dog or household…</option>
          {scopeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Start date</label>
          <input className={field} type="date" required value={form.start_date} onChange={set("start_date")} />
        </div>
        <div>
          <label className={label}>End date</label>
          <input className={field} type="date" required value={form.end_date} onChange={set("end_date")} />
        </div>
      </div>

      <div>
        <label className={label}>Reason (optional)</label>
        <input className={field} value={form.reason} onChange={set("reason")} placeholder="e.g., out of town" />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {note}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[#B85C38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a04e2e] disabled:opacity-60"
      >
        {loading ? "Adding…" : "Add vacation"}
      </button>
    </form>
  );
}
