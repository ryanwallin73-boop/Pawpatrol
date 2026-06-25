"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StopControls({ id }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function move(direction) {
    setBusy(true);
    const res = await fetch(`/api/route-stops/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/route-stops/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  const btn =
    "rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50";

  return (
    <div className="flex items-center justify-end gap-1">
      <button onClick={() => move("up")} disabled={busy} className={btn} title="Move up">
        ↑
      </button>
      <button onClick={() => move("down")} disabled={busy} className={btn} title="Move down">
        ↓
      </button>
      <button
        onClick={remove}
        disabled={busy}
        className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}
