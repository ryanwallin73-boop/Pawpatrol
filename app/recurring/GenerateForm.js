"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateForm() {
  const router = useRouter();
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    if (!month) {
      setError("Please choose a month.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/recurring/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: `${month}-01` }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Generation failed.");
      return;
    }
    setResult(data);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg bg-[#2C7A7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#256668] disabled:opacity-60"
        >
          {loading ? "Generating…" : "Generate bookings for this month"}
        </button>
      </div>

      {result ? (
        <p className="mt-3 text-sm text-emerald-700">
          Created {result.created} booking{result.created === 1 ? "" : "s"} for{" "}
          {result.periodStart} – {result.periodEnd}.{" "}
          <span className="text-gray-500">
            Skipped {result.skippedExisting} already booked, {result.skippedVacation}{" "}
            on vacation.
          </span>
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
