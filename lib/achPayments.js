import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { todayCentral, addDays } from "@/lib/monthlyBilling";
import { generateNachaFile } from "@/lib/nacha";
import { uploadAchFile, pollAchStatus } from "@/lib/bocBank";
import { decryptAccount } from "@/lib/achCrypto";

// Monthly ACH debits. Invoices go out on the 1st; the debit for everything on
// them is reviewed on the billing page and sent so the money moves on the 5th
// (the next business day when the 5th isn't one). Each debited booking points
// at its ach_payments row, so nothing is charged twice.

// ---------- business days (dates are "YYYY-MM-DD") ----------

const utc = (dateStr) => new Date(dateStr + "T00:00:00Z");
const iso = (d) => d.toISOString().slice(0, 10);

// nth (1-based) weekday of a month; n = -1 for the last one.
function nthWeekday(year, month, weekday, n) {
  if (n > 0) {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const offset = (weekday - first.getUTCDay() + 7) % 7;
    return iso(new Date(Date.UTC(year, month - 1, 1 + offset + (n - 1) * 7)));
  }
  const last = new Date(Date.UTC(year, month, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return iso(new Date(Date.UTC(year, month, -offset)));
}

// Federal Reserve holidays, when ACH doesn't settle. A fixed-date holiday on
// a Sunday is observed Monday; on a Saturday the Fed stays open Friday.
function fedHolidays(year) {
  const fixed = ["01-01", "06-19", "07-04", "11-11", "12-25"].map((md) => {
    const d = utc(`${year}-${md}`);
    if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
    return iso(d);
  });
  return new Set([
    ...fixed,
    nthWeekday(year, 1, 1, 3), // Martin Luther King Jr. Day
    nthWeekday(year, 2, 1, 3), // Washington's Birthday
    nthWeekday(year, 5, 1, -1), // Memorial Day
    nthWeekday(year, 9, 1, 1), // Labor Day
    nthWeekday(year, 10, 1, 2), // Columbus Day
    nthWeekday(year, 11, 4, 4), // Thanksgiving
  ]);
}

export function isBusinessDay(dateStr) {
  const day = utc(dateStr).getUTCDay();
  if (day === 0 || day === 6) return false;
  return !fedHolidays(Number(dateStr.slice(0, 4))).has(dateStr);
}

const onOrAfterBusinessDay = (dateStr) => {
  let d = dateStr;
  while (!isBusinessDay(d)) d = addDays(d, 1);
  return d;
};

// The 5th of this month (or the next business day), but never earlier than
// the next business day after today.
export function effectiveDateFor(today) {
  const target = onOrAfterBusinessDay(`${today.slice(0, 7)}-05`);
  const earliest = onOrAfterBusinessDay(addDays(today, 1));
  return target > earliest ? target : earliest;
}

// ---------- what would be charged ----------

// Every invoiced, completed booking not yet debited, grouped per customer.
// Customers with an approved bank account on file go in `charges`; the rest
// (no ACH, not yet approved, or numbers never kept) go in `skipped` so staff
// can collect another way. A month already marked settled (e.g. paid by
// Venmo) is left out.
export async function achChargePreview() {
  const [bookingsRes, methodsRes] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select(
        `id, service_date, price_cents,
         dogs ( customers ( id, first_name, last_name ) )`
      )
      .not("invoiced_at", "is", null)
      .is("ach_payment_id", null)
      .in("status", ["completed", "dropped_off"]),
    supabaseAdmin
      .from("payment_methods")
      .select(
        "id, customer_id, account_type, account_last4, account_number_enc, routing_number, created_at"
      )
      .eq("method_type", "ach")
      .eq("status", "verified")
      .not("account_number_enc", "is", null)
      .order("created_at", { ascending: true }),
  ]);
  if (bookingsRes.error || methodsRes.error) {
    return { error: (bookingsRes.error || methodsRes.error).message };
  }

  // Latest approved account per customer.
  const methodFor = new Map();
  for (const m of methodsRes.data ?? []) methodFor.set(m.customer_id, m);

  const months = [
    ...new Set((bookingsRes.data ?? []).map((b) => b.service_date.slice(0, 7) + "-01")),
  ];
  const settledRes = months.length
    ? await supabaseAdmin
        .from("payment_settlements")
        .select("customer_id, month_start")
        .in("month_start", months)
    : { data: [] };
  if (settledRes.error) return { error: settledRes.error.message };
  const settled = new Set(
    (settledRes.data ?? []).map((s) => `${s.customer_id}|${s.month_start}`)
  );

  const byCustomer = new Map();
  for (const b of bookingsRes.data ?? []) {
    const customer = b.dogs?.customers;
    if (!customer) continue;
    if (settled.has(`${customer.id}|${b.service_date.slice(0, 7)}-01`)) continue;
    let row = byCustomer.get(customer.id);
    if (!row) {
      row = { customer, bookingIds: [], amountCents: 0 };
      byCustomer.set(customer.id, row);
    }
    row.bookingIds.push(b.id);
    row.amountCents += b.price_cents ?? 0;
  }

  const charges = [];
  const skipped = [];
  for (const row of byCustomer.values()) {
    if (row.amountCents <= 0) continue;
    const method = methodFor.get(row.customer.id);
    if (method) charges.push({ ...row, method });
    else skipped.push(row);
  }

  const today = todayCentral();
  return {
    effectiveDate: effectiveDateFor(today),
    charges,
    skipped,
    totalCents: charges.reduce((sum, c) => sum + c.amountCents, 0),
  };
}

// ---------- sending ----------

const stamp = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date())
    .replace(/\D/g, "");

// Builds one ACH file for everything in the preview and uploads it. `expected`
// is the { count, totalCents } the person reviewed; if anything changed since,
// nothing is sent.
export async function sendAchPayments(expected) {
  const preview = await achChargePreview();
  if (preview.error) return { error: preview.error };
  if (preview.charges.length === 0) return { error: "Nothing to charge." };
  if (
    preview.charges.length !== expected?.count ||
    preview.totalCents !== expected?.totalCents
  ) {
    return {
      error: "The charges changed since you reviewed them. Review them again.",
    };
  }

  const env = process.env;
  const missing = [
    "ACH_ODFI_ROUTING",
    "ACH_ODFI_BANK_NAME",
    "ACH_COMPANY_NAME",
    "ACH_COMPANY_ID",
    "ACH_ENTRY_DESCRIPTION",
  ].filter((k) => !env[k]);
  if (missing.length) return { error: `Missing env vars: ${missing.join(", ")}` };

  // Build the entries first, so a bad account number stops everything before
  // any booking is claimed.
  const fileName = `pawpatrol_${stamp()}.ach`;
  let entries;
  try {
    entries = preview.charges.map((c) => ({
      charge: c,
      reference: "APP" + crypto.randomBytes(6).toString("hex").toUpperCase(),
      rdfiRoutingNumber: c.method.routing_number,
      rdfiAccountNumber: decryptAccount(c.method.account_number_enc),
      amountCents: c.amountCents,
      individualName: `${c.customer.first_name} ${c.customer.last_name}`,
      transactionCode: c.method.account_type === "savings" ? "37" : "27",
    }));
  } catch (e) {
    return { error: `Couldn't read a stored bank account: ${e.message}` };
  }

  const [y, m, d] = preview.effectiveDate.split("-").map(Number);
  let nacha;
  try {
    nacha = generateNachaFile(
      {
        odfiBankRoutingNumber: env.ACH_ODFI_ROUTING,
        odfiBankName: env.ACH_ODFI_BANK_NAME,
        companyName: env.ACH_COMPANY_NAME,
        companyId: env.ACH_COMPANY_ID,
        entryDescription: env.ACH_ENTRY_DESCRIPTION,
        // Local-time midnight: the generator reads local date parts.
        effectiveDate: new Date(y, m - 1, d),
      },
      entries.map((e) => ({ ...e, individualId: e.reference }))
    );
  } catch (e) {
    return { error: e.message };
  }

  // Record the payments and claim their bookings before uploading, so a
  // second click can't charge the same bookings again.
  const { data: rows, error: insertError } = await supabaseAdmin
    .from("ach_payments")
    .insert(
      entries.map((e) => ({
        customer_id: e.charge.customer.id,
        payment_method_id: e.charge.method.id,
        reference: e.reference,
        amount_cents: e.amountCents,
        effective_date: preview.effectiveDate,
        file_name: fileName,
      }))
    )
    .select("id, reference");
  if (insertError) return { error: insertError.message };

  const idFor = new Map(rows.map((r) => [r.reference, r.id]));
  const release = async () => {
    const ids = rows.map((r) => r.id);
    await supabaseAdmin.from("bookings").update({ ach_payment_id: null }).in("ach_payment_id", ids);
    await supabaseAdmin.from("ach_payments").delete().in("id", ids);
  };

  for (const e of entries) {
    const { data: claimed, error } = await supabaseAdmin
      .from("bookings")
      .update({ ach_payment_id: idFor.get(e.reference) })
      .in("id", e.charge.bookingIds)
      .is("ach_payment_id", null)
      .select("id");
    if (error || claimed.length !== e.charge.bookingIds.length) {
      await release();
      return {
        error: error
          ? error.message
          : "Some bookings were charged by another request. Review again.",
      };
    }
  }

  let bank;
  try {
    bank = await uploadAchFile(nacha.content, fileName);
  } catch (e) {
    // The bank answered with an error: nothing was accepted, so undo.
    if (/^(BOC Bank error|DUPLICATE_FILE)/.test(e.message)) {
      await release();
      return { error: e.message };
    }
    // No clear answer (network trouble): the file may have arrived. Keep the
    // claim so nothing is charged twice; a status check will sort it out.
    await supabaseAdmin
      .from("ach_payments")
      .update({ status: "upload_unknown", status_detail: e.message })
      .eq("file_name", fileName);
    return {
      error: `Couldn't confirm the upload of ${fileName}: ${e.message}. Check ACH status before trying again.`,
    };
  }

  await supabaseAdmin
    .from("ach_payments")
    .update({
      file_id: bank.file_id ?? null,
      status: bank.status ?? "Received",
      updated_at: new Date().toISOString(),
    })
    .eq("file_name", fileName);

  return {
    ok: true,
    fileName,
    fileId: bank.file_id ?? null,
    status: bank.status ?? null,
    effectiveDate: preview.effectiveDate,
    count: entries.length,
    totalCents: preview.totalCents,
  };
}

// ---------- status ----------

// Pulls the bank's status for the last 60 days of files, updates each
// payment, and marks the months it paid settled once the bank reports the
// entry Settled (and un-marks them if it's later Returned). Returns the
// bank's files for display.
export async function syncAchStatuses() {
  const toDate = todayCentral();
  const bank = await pollAchStatus({ fromDate: addDays(toDate, -60), toDate });
  const files = bank.files ?? [];

  const { data: payments, error } = await supabaseAdmin
    .from("ach_payments")
    .select("id, customer_id, reference, file_name, file_id, status, status_detail")
    .gte("created_at", addDays(toDate, -60));
  if (error) throw new Error(error.message);

  const byRef = new Map(payments.map((p) => [p.reference, p]));

  for (const f of files) {
    const items = f.items ?? [];
    for (const it of items) {
      const p = byRef.get(it.individual_id?.trim());
      if (!p) continue;
      const last = (it.events ?? []).at(-1);
      const detail = last?.event_data ? JSON.stringify(last.event_data) : null;
      await applyStatus(p, it.current_status, detail, f.file_id);
    }
    // A rejected file may come back without entries.
    if (f.status === "Rejected" && items.length === 0) {
      for (const p of payments.filter((p) => p.file_name === f.file_name)) {
        await applyStatus(p, "Rejected", null, f.file_id);
      }
    }
  }

  return files;
}

async function applyStatus(payment, status, detail, fileId) {
  if (!status) return;
  if (
    status === payment.status &&
    detail === payment.status_detail &&
    fileId === payment.file_id
  ) {
    return;
  }

  const { error } = await supabaseAdmin
    .from("ach_payments")
    .update({
      status,
      status_detail: detail,
      file_id: fileId ?? payment.file_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);
  if (error) throw new Error(error.message);

  const note = `ACH ${payment.reference}`;
  if (status === "Settled") {
    const { data: bookings, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("service_date, price_cents")
      .eq("ach_payment_id", payment.id);
    if (bErr) throw new Error(bErr.message);
    const perMonth = new Map();
    for (const b of bookings) {
      const month = b.service_date.slice(0, 7) + "-01";
      perMonth.set(month, (perMonth.get(month) ?? 0) + (b.price_cents ?? 0));
    }
    // Don't overwrite a month someone already marked settled by hand.
    const { error: sErr } = await supabaseAdmin.from("payment_settlements").upsert(
      [...perMonth].map(([month_start, amount_cents]) => ({
        customer_id: payment.customer_id,
        month_start,
        amount_cents,
        method: "ach",
        note,
        settled_at: new Date().toISOString(),
      })),
      { onConflict: "customer_id,month_start", ignoreDuplicates: true }
    );
    if (sErr) throw new Error(sErr.message);
  } else if (status === "Returned") {
    const { error: dErr } = await supabaseAdmin
      .from("payment_settlements")
      .delete()
      .eq("customer_id", payment.customer_id)
      .eq("note", note);
    if (dErr) throw new Error(dErr.message);
  }
}
