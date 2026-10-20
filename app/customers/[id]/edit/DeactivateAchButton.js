"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeactivateAchButton({ customerId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Deactivate ACH for this customer? They won't be debited again.")) return;
    setLoading(true);
    const res = await fetch(`/api/customers/${customerId}/ach`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      alert(data.error || "Couldn't deactivate ACH.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
    >
      {loading ? "Deactivating…" : "Deactivate ACH"}
    </button>
  );
}
