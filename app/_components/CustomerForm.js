"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ACH_CONSENT_TEXT } from "@/lib/ach";

const MAX_DOGS = 3;
const emptyDog = { name: "", breed: "", size: "" };

const field =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B]";
const label = "block text-sm font-medium text-gray-700";

// Shared customer + dogs + ACH form. `variant` switches the consent wording
// and success behavior between the public signup and the staff add-customer page.
export default function CustomerForm({ variant = "public", submitUrl }) {
  const router = useRouter();
  const isStaff = variant === "staff";

  const [customer, setCustomer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "Austin",
    state: "TX",
    postal_code: "",
  });
  const [dogs, setDogs] = useState([{ ...emptyDog }]);
  const [bank, setBank] = useState({
    bank_name: "",
    account_type: "checking",
    routing_number: "",
    account_number: "",
  });
  const [consent, setConsent] = useState(false);
  const [authNote, setAuthNote] = useState("");
  const [hp, setHp] = useState(""); // honeypot — must stay empty
  const [startedAt] = useState(() => Date.now());
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const setC = (k) => (e) => setCustomer({ ...customer, [k]: e.target.value });
  const setB = (k) => (e) => setBank({ ...bank, [k]: e.target.value });
  const setDog = (i, k) => (e) => {
    const next = [...dogs];
    next[i] = { ...next[i], [k]: e.target.value };
    setDogs(next);
  };

  function reset() {
    setCustomer({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address_line1: "",
      address_line2: "",
      city: "Austin",
      state: "TX",
      postal_code: "",
    });
    setDogs([{ ...emptyDog }]);
    setBank({
      bank_name: "",
      account_type: "checking",
      routing_number: "",
      account_number: "",
    });
    setConsent(false);
    setAuthNote("");
    setDone(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!consent) {
      setError(
        isStaff
          ? "Please confirm the customer authorized these ACH debits."
          : "Please authorize ACH payments to continue."
      );
      return;
    }
    setLoading(true);
    setError(null);

    const payload = { customer, dogs, bank };
    if (isStaff) {
      payload.authorized = true;
      payload.authNote = authNote;
    } else {
      payload.hp = hp;
      payload.elapsedMs = Date.now() - startedAt;
    }

    const res = await fetch(submitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setError(error || "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
  }

  if (done) {
    if (isStaff) {
      return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="font-medium text-emerald-700">Customer added.</p>
          <p className="mt-1 text-sm text-gray-600">
            Their bank numbers are waiting in{" "}
            <Link href="/ach-setups" className="font-medium underline">
              ACH Setups
            </Link>{" "}
            to key into the bank.
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <button
              onClick={reset}
              className="font-medium text-[#2C7A7B] hover:underline"
            >
              + Add another
            </button>
            <button
              onClick={() => router.push("/customers")}
              className="font-medium text-[#B85C38] hover:underline"
            >
              Go to Customers
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold uppercase tracking-wide text-[#B85C38]">
          You&apos;re all set!
        </h2>
        <p className="mt-2 text-gray-600">
          Thanks for signing up with Austin Paw Patrol. We&apos;ll be in touch
          shortly to confirm your dog&apos;s schedule.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isStaff ? (
        <div
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", top: "auto", height: 0, overflow: "hidden" }}
        >
          <label>
            Company
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
            />
          </label>
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {isStaff ? "Customer details" : "Your details"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>First name</label>
            <input className={field} required value={customer.first_name} onChange={setC("first_name")} />
          </div>
          <div>
            <label className={label}>Last name</label>
            <input className={field} required value={customer.last_name} onChange={setC("last_name")} />
          </div>
          <div>
            <label className={label}>Email</label>
            <input className={field} type="email" value={customer.email} onChange={setC("email")} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={field} value={customer.phone} onChange={setC("phone")} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Address</label>
            <input className={field} value={customer.address_line1} onChange={setC("address_line1")} placeholder="Street address" />
          </div>
          <div className="sm:col-span-2">
            <input className={field} value={customer.address_line2} onChange={setC("address_line2")} placeholder="Apt, suite, etc. (optional)" />
          </div>
          <div>
            <label className={label}>City</label>
            <input className={field} value={customer.city} onChange={setC("city")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>State</label>
              <input className={field} value={customer.state} onChange={setC("state")} />
            </div>
            <div>
              <label className={label}>ZIP</label>
              <input className={field} value={customer.postal_code} onChange={setC("postal_code")} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {isStaff ? "Dog(s)" : "Your dog(s)"}
        </h2>
        <div className="space-y-4">
          {dogs.map((dog, i) => (
            <div key={i} className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={label}>Name</label>
                <input className={field} required={i === 0} value={dog.name} onChange={setDog(i, "name")} />
              </div>
              <div>
                <label className={label}>Breed</label>
                <input className={field} value={dog.breed} onChange={setDog(i, "breed")} />
              </div>
              <div>
                <label className={label}>Size</label>
                <select className={field} value={dog.size} onChange={setDog(i, "size")}>
                  <option value="">—</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">X-Large</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        {dogs.length < MAX_DOGS ? (
          <button
            type="button"
            onClick={() => setDogs([...dogs, { ...emptyDog }])}
            className="mt-4 text-sm font-medium text-[#2C7A7B] hover:underline"
          >
            + Add another dog
          </button>
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          ACH payment
        </h2>
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

        {isStaff ? (
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
        ) : (
          <label className="mt-4 flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <span>{ACH_CONSENT_TEXT}</span>
          </label>
        )}
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#B85C38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a04e2e] disabled:opacity-60"
      >
        {loading
          ? isStaff
            ? "Adding…"
            : "Submitting…"
          : isStaff
            ? "Add customer"
            : "Sign up"}
      </button>
    </form>
  );
}
