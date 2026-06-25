"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import logo from "@/pawpatroldog.png";
import SignOutButton from "./SignOutButton";

const navLinks = [
  { href: "/customers", label: "Customers" },
  { href: "/schedules", label: "Schedules" },
  { href: "/recurring", label: "Recurring" },
  { href: "/tracking", label: "Daily Tracking" },
  { href: "/vacations", label: "Vacations" },
  { href: "/routes", label: "Route Builder" },
  { href: "/routing", label: "Van Routing" },
  { href: "/today", label: "Today's Routes" },
  { href: "/ach-setups", label: "ACH Setups" },
];

export default function Header() {
  const pathname = usePathname();

  // No nav on the login screen (the only page a signed-out user can reach).
  if (pathname?.startsWith("/login")) return null;

  return (
    <header className="border-b-2 border-[#B85C38] bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-wide text-[#B85C38] uppercase"
        >
          <Image src={logo} alt="Austin Paw Patrol" className="h-9 w-auto" priority />
          Austin Paw Patrol
        </Link>
        <div className="flex flex-wrap gap-x-6 text-sm font-medium text-gray-600">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-[#2C7A7B]">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto">
          <SignOutButton />
        </div>
      </nav>
    </header>
  );
}
