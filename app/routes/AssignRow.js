"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AssignRow({ booking, vans, date }) {
  const router = useRouter();
  const [vanId, setVanId] = useState(vans[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const owner = booking.dogs?.customers
    ? `${booking.dogs.customers.first_name} ${booking.dogs.customers.last_name}`
    : "—";

  async function handleAdd() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/routes/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, van_id: vanId, booking_id: booking.id }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({}));
      setError(error || "Failed to assign.");
    }
  }

  return (
    <tr>
      <td className="py-2 font-medium">{booking.dogs?.name ?? "—"}</td>
      <td className="py-2 text-gray-600">{owner}</td>
      <td className="py-2">{booking.services?.name ?? "—"}</td>
      <td className="py-2">
        <div className="flex items-center justify-end gap-2">
          {error ? <span className="text-xs text-red-600">{error}</span> : null}
          <select
            value={vanId}
            onChange={(e) => setVanId(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            {vans.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={loading || !vanId}
            className="rounded-lg bg-[#B85C38] px-3 py-1 text-sm font-semibold text-white transition hover:bg-[#a04e2e] disabled:opacity-60"
          >
            {loading ? "…" : "Add"}
          </button>
        </div>
      </td>
    </tr>
  );
}
