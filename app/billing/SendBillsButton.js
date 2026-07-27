"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SendBillsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(null); // "test" | "real" | null
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function send(test) {
    if (!test) {
      const ok = window.confirm(
        "Send this month's invoice + next month's schedule email to EVERY customer now? This delivers real emails and can't be undone."
      );
      if (!ok) return;
    }

    setLoading(test ? "test" : "real");
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/billing/send-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(data);
        // Reflect any bookings generated for next month.
        router.refresh();
      } else {
        setError(data.error || "Couldn't send the emails.");
      }
    } catch (e) {
      setError(e.message || "Couldn't reach the server.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => send(true)}
          disabled={loading !== null}
          className="rounded-lg border border-[#2C7A7B] px-3 py-2 text-sm font-semibold text-[#2C7A7B] transition hover:bg-[#2C7A7B]/10 disabled:opacity-60"
        >
          {loading === "test" ? "Sending…" : "Send test to me"}
        </button>
        <button
          onClick={() => send(false)}
          disabled={loading !== null}
          className="rounded-lg bg-[#B85C38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a04e2e] disabled:opacity-60"
        >
          {loading === "real" ? "Sending…" : "Send monthly bills"}
        </button>
      </div>

      {result ? (
        <p className="text-right text-xs text-gray-600">
          {result.test ? "Test — " : ""}
          Sent {result.sent} of {result.customers} customer
          {result.customers === 1 ? "" : "s"}
          {result.generated?.created
            ? `; generated ${result.generated.created} booking${
                result.generated.created === 1 ? "" : "s"
              } for next month`
            : ""}
          {result.failures?.length
            ? `; ${result.failures.length} failed`
            : ""}
          .
        </p>
      ) : null}
      {error ? <p className="text-right text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
