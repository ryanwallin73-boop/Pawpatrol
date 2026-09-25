"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompleteButton({ id }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function handleComplete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ach-setups/${id}/complete`, {
        method: "POST",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setError(
          body?.error ||
            `Failed to approve (HTTP ${res.status}${
              res.redirected ? ", redirected — try signing in again" : ""
            }).`
        );
        return;
      }
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(`Failed to approve: ${e.message || "couldn't reach the server"}.`);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm font-medium text-green-700">
        Approved — this customer will be included in ACH payments.
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={handleComplete}
        disabled={loading}
        className="rounded-lg bg-[#2C7A7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#256668] disabled:opacity-60"
      >
        {loading ? "Approving…" : "Approve for ACH"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
