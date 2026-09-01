"use client";

import { useState } from "react";

// Sends a one-entry ACH file to the bank's DEV server, debiting the sandbox
// account configured in ACH_TEST_*. No real customer data is involved.
export default function AchTestButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function send() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/ach/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: 100 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setResult(data);
      else setError(data.error || "Upload failed.");
    } catch (e) {
      setError(e.message || "Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={send}
        disabled={loading}
        className="rounded-lg border border-gray-400 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
      >
        {loading ? "Uploading…" : "Send $1 ACH test"}
      </button>

      {result ? (
        <p className="text-right text-xs text-gray-600">
          Uploaded {result.fileName} — fileId {result.bank?.file_id ?? "?"},{" "}
          {result.bank?.status ?? "no status"}, effective {result.effectiveDate}.
        </p>
      ) : null}
      {error ? <p className="text-right text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
