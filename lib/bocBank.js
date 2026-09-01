// BOC Bank ACH API client.
//
//   Upload — POST /v1/ach-files         (octet-stream body, X-API-Key auth)
//   Status — GET  /v1/ach-files/status  (X-API-Key auth)
//
// Outbound requests go through Fixie (static IP proxy) when FIXIE_URL is set,
// so the bank's IP allowlist is satisfied both locally and on Vercel.
// BOC_BANK_API_URL is never defaulted — pointing at the wrong host would send
// a live file instead of a test one.

import nodeFetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

function bankConfig() {
  const apiUrl = process.env.BOC_BANK_API_URL;
  const apiKey = process.env.BOC_BANK_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error("BOC_BANK_API_URL and BOC_BANK_API_KEY must be set");
  }
  const fixieUrl = process.env.FIXIE_URL;
  return {
    apiUrl,
    apiKey,
    agent: fixieUrl ? new HttpsProxyAgent(fixieUrl) : undefined,
  };
}

export async function uploadAchFile(nachaContent, fileName) {
  const { apiUrl, apiKey, agent } = bankConfig();
  const body = Buffer.from(nachaContent, "utf-8");

  const res = await nodeFetch(`${apiUrl}/v1/ach-files`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(body.byteLength),
      "x-file-name": fileName,
    },
    body,
    agent,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`BOC Bank returned non-JSON response (HTTP ${res.status})`);
  }

  if (!res.ok) {
    if (res.status === 409) {
      throw new Error(
        `DUPLICATE_FILE: already uploaded as fileId ${data.fileId ?? "unknown"}`
      );
    }
    throw new Error(
      `BOC Bank error ${res.status} ${data.code ?? ""}: ${
        data.message ?? JSON.stringify(data)
      }`
    );
  }

  return data;
}

// query: { fileId } | { fileName } | { fromDate, toDate },
// optionally plus { traceNumber, individualId }.
export async function pollAchStatus(query) {
  const { apiUrl, apiKey, agent } = bankConfig();

  const qs = new URLSearchParams();
  if (query.fileId) qs.set("file_id", query.fileId);
  if (query.fileName) qs.set("file_name", query.fileName);
  if (query.fromDate) {
    qs.set("from_date", query.fromDate);
    qs.set("to_date", query.toDate);
  }
  if (query.traceNumber) qs.set("trace_number", query.traceNumber);
  if (query.individualId) qs.set("individual_id", query.individualId);

  const res = await nodeFetch(`${apiUrl}/v1/ach-files/status?${qs}`, {
    method: "GET",
    headers: { "X-API-Key": apiKey },
    agent,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`BOC Bank status returned non-JSON (HTTP ${res.status})`);
  }

  if (!res.ok) {
    throw new Error(
      `BOC Bank status ${res.status} ${data.error ?? ""}: ${
        data.detail ?? JSON.stringify(data)
      }`
    );
  }

  return data;
}
