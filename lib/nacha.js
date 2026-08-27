// NACHA ACH file generator — 94-char fixed-width records, CRLF line endings.
// Ported from the Spearhead property-dashboard implementation.
// Spec: https://www.nacha.org/rules

/** Left-justify, pad with spaces, truncate to len. */
const padR = (s, len) => String(s ?? "").slice(0, len).padEnd(len, " ");

/** Right-justify as a zero-padded string, keeping the last len chars. */
const padL = (n, len) => String(n ?? 0).slice(-len).padStart(len, "0");

const yymmdd = (d) =>
  d.getFullYear().toString().slice(-2) +
  (d.getMonth() + 1).toString().padStart(2, "0") +
  d.getDate().toString().padStart(2, "0");

const hhmm = (d) =>
  d.getHours().toString().padStart(2, "0") +
  d.getMinutes().toString().padStart(2, "0");

/** Immediate destination field: space + 9 digits. */
const odfiFmt = (routing) =>
  (routing ?? "").replace(/\D/g, "").slice(0, 9).padEnd(9);

// 27 = checking debit, 37 = savings debit, 22 = checking credit, 32 = savings credit.
const DEBIT_CODES = new Set(["27", "37", "23", "33"]);

// config: { odfiBankRoutingNumber, odfiBankName, companyName, companyId,
//           entryDescription, effectiveDate, fileIdModifier? }
// entries: [{ rdfiRoutingNumber, rdfiAccountNumber, amountCents,
//             individualId, individualName, transactionCode? }]
export function generateNachaFile(config, entries) {
  if (!entries.length) throw new Error("NACHA file requires at least one entry.");

  const now = new Date();
  const fileId = config.fileIdModifier ?? "A";
  const batchNum = 1;
  const odfi8 = config.odfiBankRoutingNumber.slice(0, 8);

  // Service class: 225 debits only, 220 credits only, 200 mixed.
  let debits = 0;
  let credits = 0;
  for (const e of entries) {
    const code = e.transactionCode ?? "27";
    if (DEBIT_CODES.has(code)) debits += e.amountCents;
    else credits += e.amountCents;
  }
  const svc = debits > 0 && credits > 0 ? "200" : debits > 0 ? "225" : "220";

  const lines = [];

  // File Header (type 1)
  lines.push(
    "1" +
      "01" +
      (" " + odfiFmt(config.odfiBankRoutingNumber)) +
      padL(config.companyId, 10) +
      yymmdd(now) +
      hhmm(now) +
      fileId +
      "094" +
      "10" +
      "1" +
      padR(config.odfiBankName, 23) +
      padR(config.companyName, 23) +
      "        "
  );

  // Batch Header (type 5)
  lines.push(
    "5" +
      svc +
      padR(config.companyName, 16) +
      "".padEnd(20) +
      padR(config.companyId, 10) +
      "PPD" +
      padR(config.entryDescription, 10) +
      "".padEnd(6) +
      yymmdd(config.effectiveDate) +
      "   " +
      "1" +
      odfi8 +
      padL(batchNum, 7)
  );

  // Entry Detail (type 6)
  let entryHash = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  entries.forEach((entry, i) => {
    const code = entry.transactionCode ?? "27";
    const routing9 = entry.rdfiRoutingNumber.replace(/\D/g, "");
    const rdfi8 = routing9.slice(0, 8);
    const checkDigit = routing9.slice(8, 9);
    const traceNum = odfi8 + padL(i + 1, 7);

    lines.push(
      "6" +
        code +
        rdfi8 +
        checkDigit +
        padR(entry.rdfiAccountNumber, 17) +
        padL(entry.amountCents, 10) +
        padR(entry.individualId, 15) +
        padR(entry.individualName, 22) +
        "  " +
        "0" +
        traceNum
    );

    entryHash += parseInt(rdfi8, 10);
    if (DEBIT_CODES.has(code)) totalDebit += entry.amountCents;
    else totalCredit += entry.amountCents;
  });

  // Entry hash: last 10 digits of the sum of RDFI routing numbers.
  const hashStr = padL(entryHash % 10_000_000_000, 10);

  // Batch Control (type 8)
  lines.push(
    "8" +
      svc +
      padL(entries.length, 6) +
      hashStr +
      padL(totalDebit, 12) +
      padL(totalCredit, 12) +
      padR(config.companyId, 10) +
      "".padEnd(19) +
      "".padEnd(6) +
      odfi8 +
      padL(batchNum, 7)
  );

  // File Control (type 9). Block count includes the 9-filler padding below.
  const recordsBeforePad = lines.length + 1;
  const blockCount = Math.ceil(recordsBeforePad / 10);
  const paddingNeeded = blockCount * 10 - recordsBeforePad;

  lines.push(
    "9" +
      padL(1, 6) +
      padL(blockCount, 6) +
      padL(entries.length, 8) +
      hashStr +
      padL(totalDebit, 12) +
      padL(totalCredit, 12) +
      "".padEnd(39)
  );

  for (let p = 0; p < paddingNeeded; p++) {
    lines.push("9".repeat(94));
  }

  lines.forEach((line, i) => {
    if (line.length !== 94) {
      throw new Error(
        `NACHA record ${i + 1} is ${line.length} chars (expected 94): ${line.slice(0, 20)}...`
      );
    }
  });

  return {
    content: lines.join("\r\n"),
    entryCount: entries.length,
    totalDebitCents: totalDebit,
    totalCreditCents: totalCredit,
    blockCount,
  };
}
