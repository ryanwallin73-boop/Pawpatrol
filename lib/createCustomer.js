import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { last4 } from "@/lib/ach";

// Inserts an ACH payment method (masked last4 + consent ONLY) and stashes the
// FULL account/routing numbers in pending_ach_setups for one-time bank entry.
// Keeping this in one place means the "no full numbers in payment_methods"
// guarantee has a single source of truth.
export async function addAchPaymentMethod({ customerId, bank, consentText }) {
  // Payment method — masked last4 + consent ONLY. No full numbers here.
  const { data: pm, error: pmError } = await supabaseAdmin
    .from("payment_methods")
    .insert({
      customer_id: customerId,
      method_type: "ach",
      bank_name: bank.bank_name || null,
      account_type: bank.account_type || null,
      account_last4: last4(bank.account_number),
      routing_last4: last4(bank.routing_number),
      status: "pending",
      is_default: true,
      ach_consent_at: new Date().toISOString(),
      ach_consent_text: consentText,
    })
    .select("id")
    .single();

  if (pmError) return { error: pmError.message, status: 500 };

  // Transient full numbers — purged once keyed into the bank.
  const { error: pendingError } = await supabaseAdmin
    .from("pending_ach_setups")
    .insert({
      customer_id: customerId,
      payment_method_id: pm.id,
      account_number: bank.account_number,
      routing_number: bank.routing_number,
    });

  if (pendingError) return { error: pendingError.message, status: 500 };

  return { ok: true };
}

// Shared write path for both the public signup form and the staff
// "Add customer" page. Inserts the customer, their dogs, and (unless the
// staff page skips it to collect bank details later) their ACH info via
// addAchPaymentMethod.
export async function createCustomerWithAch({
  customer,
  dogs,
  bank,
  consentText,
  bankRequired = true,
}) {
  if (!customer?.first_name || !customer?.last_name) {
    return { error: "Name is required.", status: 400 };
  }
  const hasBank = Boolean(bank?.routing_number || bank?.account_number);
  if ((bankRequired || hasBank) && (!bank?.routing_number || !bank?.account_number)) {
    return {
      error: "Bank routing and account numbers are required.",
      status: 400,
    };
  }

  // 1. Customer
  const { data: newCustomer, error: customerError } = await supabaseAdmin
    .from("customers")
    .insert({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email || null,
      phone: customer.phone || null,
      address_line1: customer.address_line1 || null,
      address_line2: customer.address_line2 || null,
      city: customer.city || null,
      state: customer.state || null,
      postal_code: customer.postal_code || null,
    })
    .select("id")
    .single();

  if (customerError) return { error: customerError.message, status: 500 };
  const customerId = newCustomer.id;

  // 2. Dogs (skip blank rows)
  const dogRows = (dogs || [])
    .filter((d) => d.name?.trim())
    .map((d) => ({
      customer_id: customerId,
      name: d.name.trim(),
      breed: d.breed || null,
      size: d.size || null,
    }));
  if (dogRows.length > 0) {
    const { error: dogsError } = await supabaseAdmin.from("dogs").insert(dogRows);
    if (dogsError) return { error: dogsError.message, status: 500 };
  }

  // 3. ACH payment method — skipped when staff will collect bank details later.
  if (hasBank) {
    const achResult = await addAchPaymentMethod({ customerId, bank, consentText });
    if (achResult.error) return achResult;
  }

  return { ok: true };
}
