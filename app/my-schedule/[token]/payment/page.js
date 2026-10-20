import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyCustomerToken } from "@/lib/scheduleToken";
import { ACH_CONSENT_TEXT } from "@/lib/ach";
import BankForm from "./BankForm";

export const dynamic = "force-dynamic";

export default async function MyPaymentPage({ params }) {
  const { token } = await params;
  const customerId = verifyCustomerToken(token);

  const { data: customer } = customerId
    ? await supabaseAdmin
        .from("customers")
        .select("first_name, payment_methods ( method_type, status, bank_name, account_last4, created_at )")
        .eq("id", customerId)
        .maybeSingle()
    : { data: null };

  if (!customer) {
    return (
      <Shell>
        <p className="text-gray-600">
          This link isn&apos;t valid. Please use the link from your most recent
          Austin Paw Patrol email, or contact us for help.
        </p>
      </Shell>
    );
  }

  // Newest first: an approved account plus, possibly, a newer one awaiting review.
  const accounts = (customer.payment_methods ?? [])
    .filter((m) => m.method_type === "ach" && m.status !== "revoked")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <Shell>
      <p className="text-gray-700">
        Hi {customer.first_name}! Manage the bank account we debit each month
        for your grooming invoice.
      </p>

      {accounts.length === 0 ? (
        <p className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          No bank account on file.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {accounts.map((a, i) => (
            <li
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm"
            >
              <span className="font-semibold text-gray-800">
                {a.bank_name ?? "Bank account"}
              </span>{" "}
              <span className="text-gray-400">••••{a.account_last4 ?? "????"}</span>{" "}
              {a.status === "pending" ? (
                <span className="ml-1 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                  Being reviewed
                </span>
              ) : (
                <span className="ml-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  Active
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <BankForm
        token={token}
        hasAccount={accounts.length > 0}
        consentText={ACH_CONSENT_TEXT}
      />

      <p className="mt-8 text-sm">
        <Link href={`/my-schedule/${token}`} className="font-medium text-[#2C7A7B] hover:underline">
          View my schedule
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-[#B85C38]">
        Austin Paw Patrol
      </h1>
      <h2 className="mt-1 text-sm font-medium uppercase tracking-wide text-gray-400">
        My payment
      </h2>
      <div className="mt-6">{children}</div>
    </main>
  );
}
