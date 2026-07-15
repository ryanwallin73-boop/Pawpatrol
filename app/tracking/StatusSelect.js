"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  ["scheduled", "Scheduled"],
  ["pending", "Pending (customer request)"],
  ["picked_up", "Picked up"],
  ["in_service", "In service"],
  ["completed", "Completed"],
  ["dropped_off", "Dropped off"],
  ["canceled", "Canceled"],
  ["no_show", "No show"],
];

export default function StatusSelect({ id, status }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function handleChange(e) {
    const next = e.target.value;
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
    }
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={saving}
      className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B] disabled:opacity-60"
    >
      {STATUSES.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}
