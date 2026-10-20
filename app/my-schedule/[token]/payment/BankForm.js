"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const field =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B]";
const label = "block text-sm font-medium text-gray-700";

const emptyBank = {
  bank_name: "",
  account_type: "checking",
  routing_number: "",
  account_number: "",
};

export default function BankForm({ token, hasAccount, consentText }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bank, setBank] = useState(emptyBank);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const setB = (k) => (e) => setBank({ ...bank, [k]: e.target.value });

  async function post(body) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/my-schedule/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!consent) {
      setError("Please check the box to authorize ACH debits.");
      return;
    }
    if (await post({ action: "save", bank, authorized: true })) {
      setOpen(false);
      setBank(emptyBank);
      setConsent(false);
      setMessage(
        "Thanks! We'll review your new bank details. Until then, any account already approved stays in use."
      );
    }
  }

  async function handleRemove() {
    if (!confirm("Remove your bank account? We'll stop debiting it for your invoices.")) return;
    if (await post({ action: "remove" })) {
      setMessage("Your bank account was removed. We won't debit it again.");
    }
  }

  const errorNote = error ? (
    <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </p>
  ) : null;

  if (!open) {
    return (
      <div className="mt-4">
        {message ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </p>
        ) : null}
        <span className="flex items-center gap-4">
          <button
            onClick={() => {
              setOpen(true);
              setMessage(null);
              setError(null);
            }}
            className="text-sm font-medium text-[#2C7A7B] hover:underline"
          >
            {hasAccount ? "Update bank account" : "Add bank account"}
          </button>
          {hasAccount ? (
            <button
              onClick={handleRemove}
              disabled={loading}
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
            >
              {loading ? "Removing…" : "Remove bank account"}
            </button>
          ) : null}
        </span>
        {errorNote}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
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

      <label className="mt-4 flex items-start gap-3 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>{consentText}</span>
      </label>

      {errorNote}

      <span className="mt-4 flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#B85C38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a04e2e] disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save bank account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={loading}
          className="text-sm font-medium text-gray-500 hover:underline disabled:opacity-60"
        >
          Cancel
        </button>
      </span>
    </form>
  );
}
