// Canonical ACH authorization text. Stored server-side at signup time so the
// recorded consent can't be tampered with from the client.
export const ACH_CONSENT_TEXT =
  "I authorize Austin Paw Patrol to electronically debit my bank account via " +
  "ACH for dog services rendered, in the amounts and on the schedule we agree " +
  "to. This authorization remains in effect until I revoke it by contacting " +
  "Austin Paw Patrol. I confirm I am an authorized signer on this account.";

export const last4 = (value) => (value ?? "").replace(/\D/g, "").slice(-4);
