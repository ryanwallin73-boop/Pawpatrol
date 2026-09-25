import crypto from "node:crypto";

// AES-256-GCM for customer bank account numbers at rest. ACH_ENCRYPTION_KEY is
// 32 random bytes, base64. Losing it makes every stored number unreadable.

function key() {
  const k = Buffer.from(process.env.ACH_ENCRYPTION_KEY ?? "", "base64");
  if (k.length !== 32) {
    throw new Error("ACH_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  }
  return k;
}

// "v1.<iv>.<tag>.<ciphertext>", each part base64.
export function encryptAccount(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), ct]
    .map((p) => (typeof p === "string" ? p : p.toString("base64")))
    .join(".");
}

export function decryptAccount(enc) {
  const [version, iv, tag, ct] = String(enc).split(".");
  if (version !== "v1") throw new Error("Unknown account encryption format");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ct, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
