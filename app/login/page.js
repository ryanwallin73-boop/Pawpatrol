"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import hero from "@/pawpatroldogpic.png";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-8 overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5">
        <Image
          src={hero}
          alt="Austin Paw Patrol dogs — where dogs become family"
          className="h-40 w-full object-cover object-center sm:h-52"
          placeholder="blur"
          priority
        />
      </div>
      <div className="mx-auto max-w-sm">
        <h1 className="mb-1 text-2xl font-bold uppercase tracking-wide text-[#B85C38]">
          Sign in
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Austin Paw Patrol operations dashboard.
        </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B]"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B]"
          />
        </div>

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
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      </div>
    </div>
  );
}
