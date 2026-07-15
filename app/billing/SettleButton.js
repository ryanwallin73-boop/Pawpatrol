"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const shortDate = (iso) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
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
      <span className="flex items-center gap-3">
        <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
          {settlement.method === "venmo" ? "Venmo" : "ACH"} settled{" "}
          {shortDate(settlement.settled_at)}
        </span>
        <button
          onClick={() => update(false)}
          disabled={loading}
          className="text-xs font-medium text-gray-500 hover:underline disabled:opacity-60"
        >
          Undo
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm font-medium">
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
