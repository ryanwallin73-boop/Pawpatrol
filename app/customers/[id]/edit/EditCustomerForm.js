"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const field =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B]";
const label = "block text-sm font-medium text-gray-700";

const s = (v) => v ?? "";

const newDog = {
  name: "",
  breed: "",
  size: "",
  weight_lb: "",
  vaccination_expiry: "",
  active: true,
};

export default function EditCustomerForm({ customer, neighborhoods }) {
  const router = useRouter();

  const [c, setC] = useState({
    first_name: s(customer.first_name),
    last_name: s(customer.last_name),
    email: s(customer.email),
    phone: s(customer.phone),
    address_line1: s(customer.address_line1),
    address_line2: s(customer.address_line2),
    city: s(customer.city),
    state: s(customer.state),
    postal_code: s(customer.postal_code),
    neighborhood_id: s(customer.neighborhood_id),
    notes: s(customer.notes),
  });
  const [dogs, setDogs] = useState(
    (customer.dogs ?? []).map((d) => ({
      id: d.id,
      name: s(d.name),
      breed: s(d.breed),
      size: s(d.size),
      weight_lb: s(d.weight_lb),
      vaccination_expiry: s(d.vaccination_expiry),
      active: d.active !== false,
    }))
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const setField = (k) => (e) => setC({ ...c, [k]: e.target.value });
  const setDog = (i, k, val) => {
    const next = [...dogs];
    next[i] = { ...next[i], [k]: val };
    setDogs(next);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/customers/${customer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer: c, dogs }),
    });

    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setError(error || "Couldn't save changes.");
      return;
    }
    router.push("/customers");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Customer details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>First name</label>
            <input className={field} required value={c.first_name} onChange={setField("first_name")} />
          </div>
          <div>
            <label className={label}>Last name</label>
            <input className={field} required value={c.last_name} onChange={setField("last_name")} />
          </div>
          <div>
            <label className={label}>Email</label>
            <input className={field} type="email" value={c.email} onChange={setField("email")} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={field} value={c.phone} onChange={setField("phone")} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Address</label>
            <input className={field} value={c.address_line1} onChange={setField("address_line1")} placeholder="Street address" />
          </div>
          <div className="sm:col-span-2">
            <input className={field} value={c.address_line2} onChange={setField("address_line2")} placeholder="Apt, suite, etc. (optional)" />
          </div>
          <div>
            <label className={label}>City</label>
            <input className={field} value={c.city} onChange={setField("city")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>State</label>
              <input className={field} value={c.state} onChange={setField("state")} />
            </div>
            <div>
              <label className={label}>ZIP</label>
              <input className={field} value={c.postal_code} onChange={setField("postal_code")} />
            </div>
          </div>
          <div>
            <label className={label}>Neighborhood</label>
            <select className={field} value={c.neighborhood_id} onChange={setField("neighborhood_id")}>
              <option value="">— Unassigned —</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Notes</label>
            <textarea className={field} rows={2} value={c.notes} onChange={setField("notes")} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Dogs
        </h2>
        <div className="space-y-4">
          {dogs.map((dog, i) => (
            <div key={dog.id ?? `new-${i}`} className="rounded-lg border border-gray-100 p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={label}>Name</label>
                  <input className={field} value={dog.name} onChange={(e) => setDog(i, "name", e.target.value)} />
                </div>
                <div>
                  <label className={label}>Breed</label>
                  <input className={field} value={dog.breed} onChange={(e) => setDog(i, "breed", e.target.value)} />
                </div>
                <div>
                  <label className={label}>Size</label>
                  <select className={field} value={dog.size} onChange={(e) => setDog(i, "size", e.target.value)}>
                    <option value="">—</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="xlarge">X-Large</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Weight (lb)</label>
                  <input className={field} inputMode="decimal" value={dog.weight_lb} onChange={(e) => setDog(i, "weight_lb", e.target.value)} />
                </div>
                <div>
                  <label className={label}>Vaccination expiry</label>
                  <input className={field} type="date" value={dog.vaccination_expiry} onChange={(e) => setDog(i, "vaccination_expiry", e.target.value)} />
                </div>
                <label className="mt-6 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={dog.active}
                    onChange={(e) => setDog(i, "active", e.target.checked)}
                  />
                  Active
                </label>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDogs([...dogs, { ...newDog }])}
          className="mt-4 text-sm font-medium text-[#2C7A7B] hover:underline"
        >
          + Add dog
        </button>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#B85C38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a04e2e] disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/customers")}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
