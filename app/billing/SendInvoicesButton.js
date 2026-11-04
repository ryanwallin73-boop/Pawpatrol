"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Invoice the completed visits that weren't on the month's bills (e.g.
// attendance entered late). No schedule; safe to run more than once.
export default function SendInvoicesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(null); // "test" | "real" | null
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function send(test) {
    if (!test) {
      const ok = window.confirm(
        "Email an invoice to every customer with completed visits that haven't been invoiced yet? This delivers real emails and can't be undone."
      );
      if (!ok) return;
    }

    setLoading(test ? "test" : "real");
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/billing/send-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(data);
        router.refresh();
      } else {
        setError(data.error || "Couldn't send the invoices.");
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
          {loading === "test" ? "Sending…" : "Test invoices to me"}
        </button>
        <button
          onClick={() => send(false)}
          disabled={loading !== null}
          className="rounded-lg bg-[#B85C38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a04e2e] disabled:opacity-60"
        >
          {loading === "real" ? "Sending…" : "Send invoices only"}
        </button>
      </div>

      {result ? (
        <p className="text-right text-xs text-gray-600">
          {result.test ? "Test — " : ""}
          Sent {result.sent} of {result.customers} invoice
          {result.customers === 1 ? "" : "s"}
          {result.failures?.length ? `; ${result.failures.length} failed` : ""}.
        </p>
      ) : null}
      {error ? <p className="text-right text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
