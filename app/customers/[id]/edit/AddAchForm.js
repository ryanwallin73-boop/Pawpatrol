"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const field =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B]";
const label = "block text-sm font-medium text-gray-700";

// Adds ACH details for a customer who was created without them.
export default function AddAchForm({ customerId }) {
  const router = useRouter();

  const [bank, setBank] = useState({
    bank_name: "",
    account_type: "checking",
    routing_number: "",
    account_number: "",
  });
  const [consent, setConsent] = useState(false);
  const [authNote, setAuthNote] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const setB = (k) => (e) => setBank({ ...bank, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!consent) {
      setError("Please confirm the customer authorized these ACH debits.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/customers/${customerId}/ach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bank, authorized: true, authNote }),
    });

    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setError(error || "Couldn't save ACH details.");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="font-medium text-emerald-700">ACH details saved.</p>
        <p className="mt-1 text-sm text-gray-600">
          The bank numbers are waiting in{" "}
          <Link href="/ach-setups" className="font-medium underline">
            ACH Setups
          </Link>{" "}
          to key into the bank.
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          ACH payment
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          No payment method on file yet.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Bank name</label>
            <input className={field} required value={bank.bank_name} onChange={setB("bank_name")} />
          </div>
          <div>
            <label className={label}>Account type</label>
            <select className={field} value={bank.account_type} onChange={setB("account_type")}>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>
          <div>
            <label className={label}>Routing number</label>
            <input className={field} required inputMode="numeric" value={bank.routing_number} onChange={setB("routing_number")} />
          </div>
          <div>
            <label className={label}>Account number</label>
            <input className={field} required inputMode="numeric" value={bank.account_number} onChange={setB("account_number")} />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <span>
              I confirm the customer authorized Austin Paw Patrol to debit this
              account via ACH (e.g., received by email or a signed form).
            </span>
          </label>
          <div>
            <label className={label}>
              How/when authorization was received (optional)
            </label>
            <input
              className={field}
              value={authNote}
              onChange={(e) => setAuthNote(e.target.value)}
              placeholder="e.g., email on 2026-06-20"
            />
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-lg bg-[#B85C38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a04e2e] disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save ACH details"}
        </button>
      </section>
    </form>
  );
}
