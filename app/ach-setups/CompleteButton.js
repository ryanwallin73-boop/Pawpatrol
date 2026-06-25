"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompleteButton({ id }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleComplete() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/ach-setups/${id}/complete`, {
      method: "POST",
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setError(error || "Failed to purge. Try again.");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleComplete}
        disabled={loading}
        className="rounded-lg bg-[#2C7A7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#256668] disabled:opacity-60"
      >
        {loading ? "Purging…" : "Mark entered & purge numbers"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
