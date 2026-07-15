"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingActions({ id, serviceDate }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(serviceDate);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_date: date }),
    });
    setLoading(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({}));
      alert(error || "Couldn't update the booking.");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this booking?")) return;
    setLoading(true);
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  if (editing) {
    return (
      <span className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={loading}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B] disabled:opacity-60"
        />
        <button
          onClick={handleSave}
          disabled={loading || !date}
          className="text-sm font-medium text-[#2C7A7B] hover:underline disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setDate(serviceDate);
          }}
          disabled={loading}
          className="text-sm font-medium text-gray-500 hover:underline disabled:opacity-60"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-3">
      <button
        onClick={() => setEditing(true)}
        className="text-sm font-medium text-[#2C7A7B] hover:underline"
      >
        Edit
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
      >
        {loading ? "Deleting…" : "Delete"}
      </button>
    </span>
  );
}
