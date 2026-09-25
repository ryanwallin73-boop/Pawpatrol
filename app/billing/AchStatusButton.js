"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Shows the bank's status for the ACH files it received in the last 60 days,
// and refreshes the page since settled payments mark their months paid.
export default function AchStatusButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState(null);
  const [error, setError] = useState(null);

  async function check() {
    setLoading(true);
    setFiles(null);
    setError(null);
    try {
      const res = await fetch("/api/ach/status");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFiles(data.files);
        router.refresh();
      } else setError(data.error || "Status check failed.");
    } catch (e) {
      setError(e.message || "Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={check}
        disabled={loading}
        className="rounded-lg border border-gray-400 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
      >
        {loading ? "Checking…" : "Check ACH status"}
      </button>

      {files && files.length === 0 ? (
        <p className="text-right text-xs text-gray-600">
          No ACH files in the last 60 days.
        </p>
      ) : null}
      {files && files.length > 0 ? (
        <ul className="text-right text-xs text-gray-600">
          {files.map((f) => (
            <li key={f.file_id}>
              {f.file_id} — {f.status}
              {(f.items ?? []).map((it) => (
                <div key={it.bank_reference}>
                  ${(it.amount / 100).toFixed(2)} {it.individual_name} —{" "}
                  {it.current_status}, effective {it.effective_date}
                </div>
              ))}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-right text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
