"use client";

import { useRouter } from "next/navigation";

// "YYYY-MM-DD" shifted by n days.
const shiftDay = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const longLabel = (dateStr) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateStr + "T00:00:00Z"));

export default function DateNav({ date, today }) {
  const router = useRouter();
  const go = (d) => router.push(`/tracking?date=${d}`);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 text-sm font-medium">
      <button
        onClick={() => go(shiftDay(date, -1))}
        className="text-[#2C7A7B] hover:underline"
      >
        ← Previous day
      </button>
      <span className="text-lg font-semibold text-gray-800">
        {longLabel(date)}
      </span>
      <button
        onClick={() => go(shiftDay(date, 1))}
        className="text-[#2C7A7B] hover:underline"
      >
        Next day →
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm font-normal outline-none focus:border-[#2C7A7B] focus:ring-1 focus:ring-[#2C7A7B]"
      />
      {date !== today ? (
        <button
          onClick={() => go(today)}
          className="text-[#2C7A7B] hover:underline"
        >
          Jump to today
        </button>
      ) : null}
    </div>
  );
}
