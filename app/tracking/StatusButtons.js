"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CHOICES = [
  ["completed", "Completed", "bg-emerald-600 hover:bg-emerald-700"],
  ["canceled", "Canceled", "bg-red-600 hover:bg-red-700"],
];

export default function StatusButtons({ id, status }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function setStatus(next) {
    if (next === value) return;
    const prev = value;
    setValue(next);
    setSaving(true);

    const res = await fetch(`/api/bookings/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });

    setSaving(false);
    if (res.ok) {
      router.refresh();
    } else {
      setValue(prev); // revert on failure
      const { error } = await res.json().catch(() => ({}));
      alert(error || "Couldn't update the status.");
    }
  }

  return (
    <div className="flex gap-2">
      {CHOICES.map(([v, label, activeClass]) => (
        <button
          key={v}
          onClick={() => setStatus(v)}
          disabled={saving}
          className={`rounded-lg px-3 py-1 text-sm font-medium transition disabled:opacity-60 ${
            value === v
              ? `${activeClass} text-white`
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          {value === v ? `✓ ${label}` : label}
        </button>
      ))}
    </div>
  );
}
