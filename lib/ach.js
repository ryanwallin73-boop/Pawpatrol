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
