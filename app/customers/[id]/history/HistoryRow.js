"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/app/_components/ui";

const input =
  "rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B] disabled:opacity-60";

const money = (cents) =>
  typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "—";

export default function HistoryRow({ booking: b, locked }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(b.service_date);
  const [end, setEnd] = useState(b.end_date ?? "");
  const [loading, setLoading] = useState(false);
  const isBoarding = !!b.end_date;
  const canceled = b.status === "canceled";
  const completed = ["completed", "dropped_off"].includes(b.status);

  async function send(url, body) {
    setLoading(true);
    const res = await fetch(url, {
      method: url.endsWith("/status") ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  const save = () =>
    send(`/api/bookings/${b.id}`, {
      service_date: start,
      ...(isBoarding ? { end_date: end } : {}),
    });

  function toggleCancel() {
    if (!canceled && !confirm("Cancel this booking?")) return;
    send(`/api/bookings/${b.id}/status`, {
      status: canceled ? "scheduled" : "canceled",
    });
  }

  return (
    <tr className={canceled ? "text-gray-400" : ""}>
      <td className="py-2 font-medium">
        {editing ? (
          <span className="flex flex-wrap items-center gap-2">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} disabled={loading} className={input} />
            {isBoarding ? (
              <>
                –
                <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} disabled={loading} className={input} />
              </>
            ) : null}
          </span>
        ) : (
          <>
            {b.service_date}
            {b.end_date ? ` – ${b.end_date}` : ""}
          </>
        )}
      </td>
      <td className="py-2">{b.dogs?.name ?? "—"}</td>
      <td className="py-2">{b.services?.name ?? "—"}</td>
      <td className="py-2">{money(b.price_cents)}</td>
      <td className="py-2">
        <Badge status={b.status} />
      </td>
      <td className="py-2">
        {locked ? (
          <span className="text-sm text-gray-400">
            Invoiced{" "}
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "America/Chicago",
            }).format(new Date(b.invoiced_at))}
          </span>
        ) : editing ? (
          <span className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={loading || !start || (isBoarding && end <= start)}
              className="text-sm font-medium text-[#2C7A7B] hover:underline disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setStart(b.service_date);
                setEnd(b.end_date ?? "");
              }}
              disabled={loading}
              className="text-sm font-medium text-gray-500 hover:underline disabled:opacity-60"
            >
              Back
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-3">
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-medium text-[#2C7A7B] hover:underline"
            >
              {isBoarding ? "Change days" : "Change date"}
            </button>
            {!canceled && !completed ? (
              <button
                onClick={() =>
                  send(`/api/bookings/${b.id}/status`, { status: "completed" })
                }
                disabled={loading}
                className="text-sm font-medium text-emerald-700 hover:underline disabled:opacity-60"
              >
                Complete
              </button>
            ) : null}
            <button
              onClick={toggleCancel}
              disabled={loading}
              className={`text-sm font-medium hover:underline disabled:opacity-60 ${
                canceled ? "text-[#2C7A7B]" : "text-red-600"
              }`}
            >
              {canceled ? "Restore" : "Cancel"}
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}
