"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AppointmentRow({ token, booking }) {
  const router = useRouter();
  const [mode, setMode] = useState("view"); // view | move
  const [newDate, setNewDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function act(action, extra = {}) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/my-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, booking_id: booking.id, action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    setMode("view");
    router.refresh();
  }

  function handleCancel() {
    if (
      !confirm(
        `Cancel ${booking.dog}'s ${booking.service} on ${booking.dateLabel}?`
      )
    )
      return;
    act("cancel");
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-800">{booking.dateLabel}</p>
          <p className="text-sm text-gray-600">
            {booking.dog} — {booking.service}
          </p>
          {booking.status === "pending" ? (
            <p className="mt-1 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
              Date change pending confirmation
            </p>
          ) : null}
        </div>

        {mode === "view" ? (
          <span className="flex items-center gap-3">
            <button
              onClick={() => setMode("move")}
              disabled={loading}
              className="text-sm font-medium text-[#2C7A7B] hover:underline disabled:opacity-60"
            >
              Change date
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
            >
              {loading ? "Canceling…" : "Cancel"}
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B] disabled:opacity-60"
            />
            <button
              onClick={() => act("move", { new_date: newDate })}
              disabled={loading || !newDate}
              className="text-sm font-medium text-[#2C7A7B] hover:underline disabled:opacity-60"
            >
              {loading ? "Sending…" : "Request"}
            </button>
            <button
              onClick={() => {
                setMode("view");
                setError(null);
              }}
              disabled={loading}
              className="text-sm font-medium text-gray-500 hover:underline disabled:opacity-60"
            >
              Back
            </button>
          </span>
        )}
      </div>

      {error ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </li>
  );
}
