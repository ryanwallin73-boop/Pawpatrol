// Canonical ACH authorization text. Stored server-side at signup time so the
// recorded consent can't be tampered with from the client.
export const ACH_CONSENT_TEXT =
  "I authorize Austin Paw Patrol to electronically debit my bank account via " +
  "ACH once each month for dog grooming services provided that month, at the " +
  "prices in effect when each visit was booked. I will receive an itemized " +
  "invoice by email showing the amount before each debit. This authorization " +
  "remains in effect until I cancel it by contacting Austin Paw Patrol, which " +
  "I may do at any time. I confirm I am an authorized signer on this account.";

export const last4 = (value) => (value ?? "").replace(/\D/g, "").slice(-4);

// ABA routing number check digit: 3·(d1+d4+d7) + 7·(d2+d5+d8) + (d3+d6+d9)
// must be a multiple of 10. Catches typos and made-up numbers, not whether
// the account itself exists.
export function isValidRoutingNumber(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length !== 9) return false;
  const d = [...digits].map(Number);
  const sum =
    3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}
