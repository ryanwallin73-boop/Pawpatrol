"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/app/_components/ui";

const money = (cents) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const longDate = (dateStr) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateStr + "T00:00:00Z"));

const name = (c) => (c ? `${c.first_name} ${c.last_name}` : "Unknown customer");

// Review the month's ACH debits for invoiced services, then send them to the
// bank in one file.
export default function AchPaymentsPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [data, setData] = useState(null);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);

  async function review() {
    setLoading(true);
    setError(null);
    setSent(null);
    try {
      const res = await fetch("/api/ach/payments");
      const body = await res.json().catch(() => ({}));
      if (res.ok) setData(body);
      else setError(body.error || "Couldn't load ACH payments.");
    } catch (e) {
      setError(e.message || "Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const count = data.charges.length;
    if (
      !window.confirm(
        `Debit ${count} customer${count === 1 ? "" : "s"} a total of ${money(
          data.totalCents
        )}, effective ${longDate(data.effectiveDate)}?`
      )
    ) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/ach/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, totalCents: data.totalCents }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(body);
        setData(null);
        router.refresh();
      } else {
        setError(body.error || "Sending failed.");
      }
    } catch (e) {
      setError(e.message || "Couldn't reach the server.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card title="ACH payments">
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={review}
            disabled={loading || sending}
            className="rounded-lg border border-gray-400 px-3 py-2 font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Review ACH payments"}
          </button>
          <span className="text-gray-500">
            Debits for services on invoices already emailed, effective the 5th
            (or the next business day).
          </span>
        </div>

        {sent ? (
          <p className="text-green-700">
            Sent {sent.count} payment{sent.count === 1 ? "" : "s"} (
            {money(sent.totalCents)}) in {sent.fileName} — fileId{" "}
            {sent.fileId ?? "?"}, {sent.status ?? "no status"}, effective{" "}
            {longDate(sent.effectiveDate)}.
          </p>
        ) : null}
        {error ? <p className="text-red-600">{error}</p> : null}

        {data ? (
          <>
            {data.charges.length === 0 ? (
              <p className="text-gray-500">Nothing to charge right now.</p>
            ) : (
              <div>
                <p className="mb-2 font-medium text-gray-800">
                  To charge — effective {longDate(data.effectiveDate)}
                </p>
                <table className="w-full text-left">
                  <tbody className="divide-y divide-gray-100">
                    {data.charges.map((c) => (
                      <tr key={c.customer.id}>
                        <td className="py-1.5">{name(c.customer)}</td>
                        <td className="py-1.5 text-gray-500">
                          {c.bookings} visit{c.bookings === 1 ? "" : "s"}
                        </td>
                        <td className="py-1.5 text-gray-500">
                          {c.accountType ?? "account"} ••••{c.accountLast4}
                        </td>
                        <td className="py-1.5 text-right">{money(c.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 font-semibold">
                      <td className="py-1.5" colSpan={3}>
                        Total
                      </td>
                      <td className="py-1.5 text-right">{money(data.totalCents)}</td>
                    </tr>
                  </tfoot>
                </table>
                <button
                  onClick={send}
                  disabled={sending}
                  className="mt-3 rounded-lg bg-[#2C7A7B] px-4 py-2 font-semibold text-white transition hover:bg-[#256668] disabled:opacity-60"
                >
                  {sending
                    ? "Sending…"
                    : `Send ${data.charges.length} ACH payment${
                        data.charges.length === 1 ? "" : "s"
                      }`}
                </button>
              </div>
            )}

            {data.skipped.length > 0 ? (
              <div>
                <p className="mb-1 font-medium text-gray-800">
                  Not charged — no approved bank account on file
                </p>
                <ul className="text-gray-600">
                  {data.skipped.map((s) => (
                    <li key={s.customer.id}>
                      {name(s.customer)} — {money(s.amountCents)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {data.recent.length > 0 ? (
              <div>
                <p className="mb-1 font-medium text-gray-800">
                  Sent in the last 60 days
                </p>
                <ul className="text-gray-600">
                  {data.recent.map((p) => (
                    <li key={p.id}>
                      {name(p.customers)} — {money(p.amount_cents)}, effective{" "}
                      {longDate(p.effective_date)}: {p.status}
                      {p.status_detail ? ` (${p.status_detail})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Card>
  );
}
