"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const shortDateTime = (iso) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(iso));

export default function SettleButton({
  customerId,
  monthStart,
  amountCents,
  settlement,
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  async function update(settled, method) {
    setLoading(true);
    const res = await fetch("/api/billing/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        month_start: monthStart,
        amount_cents: amountCents,
        settled,
        method,
        note,
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({}));
      alert(error || "Couldn't update the payment status.");
    }
  }

  if (settlement) {
    return (
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-3">
          <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            {settlement.method === "venmo" ? "Venmo" : "ACH"} settled{" "}
            {shortDateTime(settlement.settled_at)}
          </span>
          <button
            onClick={() => update(false)}
            disabled={loading}
            className="text-xs font-medium text-gray-500 hover:underline disabled:opacity-60"
          >
            Undo
          </button>
        </span>
        {settlement.note ? (
          <span className="text-xs text-gray-500 italic">{settlement.note}</span>
        ) : null}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm font-medium">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={loading}
        placeholder="Note (optional)"
        className="w-36 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm font-normal outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B] disabled:opacity-60"
      />
      <span className="text-gray-400">Paid via:</span>
      <button
        onClick={() => update(true, "ach")}
        disabled={loading}
        className="text-[#2C7A7B] hover:underline disabled:opacity-60"
      >
        ACH
      </button>
      <button
        onClick={() => update(true, "venmo")}
        disabled={loading}
        className="text-[#2C7A7B] hover:underline disabled:opacity-60"
      >
        Venmo
      </button>
    </span>
  );
}
