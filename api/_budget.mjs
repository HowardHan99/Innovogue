/* =============== the $50 =============== */

/* Every Gemini call in this project passes through here. The cap is a hard
   gate, not telemetry: when total estimated spend reaches DD_BUDGET_USD
   (default $50), guard() starts throwing 402 and every AI feature falls back
   to its canned path — words from the canned engine, mood images from
   MOODPIX. The product keeps working, it just stops costing money.

   The ledger lives in the project's Vercel Blob store (dd-ledger) so it
   survives cold starts and is shared across every function instance and
   environment. Without a token (bare local runs) it degrades to per-process
   memory, which still caps a runaway loop, just not across restarts.

   Concurrent writes can race; a lost update under-counts by one call. The
   cap is enforced against money, not billing-grade accounting — Google's
   console is the audit; this is the circuit breaker. */

import { get, put } from "@vercel/blob";

export const CAP_USD = Number(process.env.DD_BUDGET_USD || 50);

/* gemini list prices, USD. flash text per token; image flat per image
   (1290 output tokens at $30/1M ~= $0.039). */
export const PRICE = {
  textIn: 0.30 / 1e6,
  textOut: 2.50 / 1e6,
  image: 0.039,
};

const PATH = "dd/ledger.json";
let mem = { spent: 0, calls: 0 };

/* the sdk reads process.env by default; locally the token arrives via
   .env.local through serve.mjs's env object, so pass it explicitly */
const blobToken = (env) => env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
const hasBlob = (env) => !!blobToken(env);

async function readLedger(env = process.env) {
  if (!hasBlob(env)) return { ...mem };
  try {
    const g = await get(PATH, { access: "private", token: blobToken(env) });
    if (g && g.stream && g.statusCode === 200) {
      const body = await new Response(g.stream).json();
      if (typeof body?.spent === "number") return body;
    }
  } catch {
    /* missing ledger or transient blob error: treat as empty rather than
       failing open forever or failing the request */
  }
  return { spent: 0, calls: 0 };
}

async function writeLedger(ledger, env = process.env) {
  mem = { ...ledger };
  if (!hasBlob(env)) return;
  try {
    await put(PATH, JSON.stringify(ledger), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token: blobToken(env),
    });
  } catch {
    /* memory still has it; next successful write catches up */
  }
}

/** Current state, for /api/budget and for humans. */
export async function budget(env = process.env) {
  const l = await readLedger(env);
  return {
    spent: Math.round(l.spent * 10000) / 10000,
    cap: CAP_USD,
    left: Math.max(0, Math.round((CAP_USD - l.spent) * 10000) / 10000),
    calls: l.calls ?? 0,
    persistent: hasBlob(env),
  };
}

/** Throws 402 if this call's worst-case cost would cross the cap.
    Returns the ledger so record() can reuse it without a second read. */
export async function guard(estimateUsd, env = process.env) {
  const l = await readLedger(env);
  if (l.spent + estimateUsd > CAP_USD) {
    const e = new Error(
      `AI budget cap reached: $${l.spent.toFixed(2)} of $${CAP_USD} spent`
    );
    e.status = 402;
    throw e;
  }
  return l;
}

/** Book actual cost after the call. Pass the ledger guard() returned. */
export async function record(usd, ledger, env = process.env) {
  const l = ledger ?? (await readLedger(env));
  l.spent = (l.spent || 0) + usd;
  l.calls = (l.calls || 0) + 1;
  l.updated = new Date().toISOString();
  await writeLedger(l, env);
}
