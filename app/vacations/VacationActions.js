"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const dateField =
  "rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B] disabled:opacity-60";

export default function VacationActions({ id, startDate, endDate }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    const res = await fetch(`/api/vacations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: start, end_date: end }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      alert(data.error || "Couldn't update the vacation.");
      return;
    }
    if (data.canceled > 0) {
      alert(
        `Canceled ${data.canceled} scheduled booking${
          data.canceled === 1 ? "" : "s"
        } in the new range.`
      );
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Remove this vacation?")) return;
    setLoading(true);
    const res = await fetch(`/api/vacations/${id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  if (editing) {
    return (
      <span className="flex items-center justify-end gap-2">
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          disabled={loading}
          className={dateField}
        />
        <span className="text-gray-400">–</span>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          disabled={loading}
          className={dateField}
        />
        <button
          onClick={handleSave}
          disabled={loading || !start || !end}
          className="text-sm font-medium text-[#2C7A7B] hover:underline disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setStart(startDate);
            setEnd(endDate);
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
    <span className="flex items-center justify-end gap-3">
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
        {loading ? "Removing…" : "Remove"}
      </button>
    </span>
  );
}
