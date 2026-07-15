import { createHmac, timingSafeEqual } from "node:crypto";

// Unguessable per-customer token for the public "my schedule" link:
// "<customer_id>.<hmac>". No DB column needed; verifiable with LINK_SECRET.
function secret() {
  const s = process.env.LINK_SECRET;
  if (!s) throw new Error("LINK_SECRET env var is not set.");
  return s;
}

export function customerToken(customerId) {
  const sig = createHmac("sha256", secret())
    .update(String(customerId))
    .digest("hex")
    .slice(0, 32);
  return `${customerId}.${sig}`;
}

// Returns the customer id if the token is valid, else null.
export function verifyCustomerToken(token) {
  const i = (token ?? "").lastIndexOf(".");
  if (i < 1) return null;
  const customerId = token.slice(0, i);
  const expected = Buffer.from(customerToken(customerId));
  const actual = Buffer.from(token);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  return customerId;
}
