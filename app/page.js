import Link from "next/link";
import Image from "next/image";
import hero from "@/pawpatroldogpic.png";

const screens = [
  {
    href: "/customers",
    title: "Customers",
    blurb: "Households, their dogs, and payment methods on file.",
    icon: "🐶",
  },
  {
    href: "/schedules",
    title: "Schedules",
    blurb: "Recurring standing schedules, bookings, and vacation days.",
    icon: "🗓️",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5">
        <Image
          src={hero}
          alt="Austin Paw Patrol dogs — where dogs become family"
          className="h-56 w-full object-cover object-center sm:h-72"
          placeholder="blur"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 sm:p-8">
          <h1 className="text-3xl font-bold uppercase tracking-wide text-white drop-shadow sm:text-4xl">
            Dashboard
          </h1>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        {screens.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-start gap-4 rounded-xl border border-gray-200 border-l-4 border-l-[#B85C38] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-l-[#2C7A7B] hover:shadow-md"
          >
            <span className="text-2xl">{s.icon}</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-[#B85C38]">
                {s.title}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{s.blurb}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
