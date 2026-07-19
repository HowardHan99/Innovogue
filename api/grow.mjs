/* =============== /api/grow =============== */

/* The one server-side piece of Design Diffusion: a word goes in, associations
   come out. Runs as a Vercel function; scripts/serve.mjs mounts the same
   handler locally so the prototype behaves identically on both.

   The brief the model is held to is DD.proposePrompt from src/grow.ts,
   imported via the generated api/_grow-core.mjs (npm run core) so the client
   and server can never drift apart. The prompt is built HERE from term +
   context — whatever prompt text the client sends is ignored, because this is
   a public endpoint and the key behind it is not a general-purpose proxy.

   The model never selects: it returns candidates, the user lights the ones
   that matter. Failure of any kind is answered by the client falling back to
   the canned engine, so the garden keeps growing with or without us. */

import { proposePrompt, describePrompt } from "./_grow-core.mjs";
import { guard, record, PRICE } from "./_budget.mjs";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

/* the user's own reference, client-shrunk to <=768px jpeg (~100-250KB as
   base64). The cap is a backstop against someone POSTing us a raw photo. */
const IMAGE_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMAGE_LEN = 2_000_000;

function imagePart(body) {
  const raw = body?.image ?? body?.context?.image;
  if (typeof raw !== "string" || raw.length > MAX_IMAGE_LEN) return null;
  const m = IMAGE_RE.exec(raw);
  return m ? { inlineData: { mimeType: m[1], data: m[2] } } : null;
}

function sanitize(body) {
  const term = String(body?.term ?? "").trim().slice(0, 60);
  const ctx = body?.context ?? {};
  const clean = (arr, n, len) =>
    Array.isArray(arr)
      ? arr.filter((s) => typeof s === "string").map((s) => s.trim().slice(0, len)).filter(Boolean).slice(0, n)
      : [];
  return {
    term,
    context: {
      seed: typeof ctx.seed === "string" ? ctx.seed.slice(0, 60) : undefined,
      lineage: clean(ctx.lineage, 8, 40),
      avoid: clean(ctx.avoid, 40, 40),
    },
  };
}

const WORDS_SCHEMA = {
  type: "OBJECT",
  properties: { words: { type: "ARRAY", items: { type: "STRING" } } },
  required: ["words"],
};
const DESCRIBE_SCHEMA = {
  type: "OBJECT",
  properties: {
    label: { type: "STRING", description: "2-4 lowercase words naming what the image shows" },
    words: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["label", "words"],
};

/* live gemini has returned words with literal \r\n inside them — collapse
   all whitespace runs before anything reaches a garden label */
const cleanWords = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .filter((w) => typeof w === "string")
    .map((w) => w.replace(/\s+/g, " ").trim().toLowerCase())
    .filter((w) => w && w.length <= 40)
    .slice(0, 4);

async function callGemini(parts, schema, apiKey, model, withThinkingOff) {
  const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: schema,
    /* the garden wants range, not the single most likely association */
    temperature: 1.15,
    maxOutputTokens: 300,
  };
  /* three association words need no deliberation, and the garden's grow
     animation is 600ms — thinking would double the wait for nothing */
  if (withThinkingOff) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const res = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig,
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    const err = new Error(`gemini ${res.status}: ${detail}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p?.text ?? "")
    .join("");
  const u = data?.usageMetadata ?? {};
  const cost =
    (u.promptTokenCount || 0) * PRICE.textIn +
    ((u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0)) * PRICE.textOut;
  return { json: JSON.parse(text), cost };
}

async function callWithRetry(parts, schema, apiKey, model) {
  try {
    return await callGemini(parts, schema, apiKey, model, true);
  } catch (e) {
    /* an older or lite model may reject thinkingConfig — retry plain once */
    if (e.status === 400) return callGemini(parts, schema, apiKey, model, false);
    throw e;
  }
}

function requireKey(env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error("GEMINI_API_KEY not configured");
    err.status = 503;
    throw err;
  }
  return apiKey;
}

/** term + context (+ optional attached upload) -> up to 4 candidate words.
    Exported for scripts/serve.mjs. */
export async function growWords(body, env = process.env) {
  const apiKey = requireKey(env);
  const { term, context } = sanitize(body);
  if (!term) {
    const err = new Error("term required");
    err.status = 400;
    throw err;
  }
  const img = imagePart(body);
  /* proposePrompt only checks image for truthiness — never inline the data */
  const prompt = proposePrompt(term, img ? { ...context, image: "attached" } : context, 3);
  const parts = img ? [{ text: prompt }, img] : [{ text: prompt }];
  const model = env.GROW_MODEL || DEFAULT_MODEL;
  /* worst case for one grow call is well under a cent; gate on that, then
     book what the response actually reports */
  const ledger = await guard(img ? 0.01 : 0.005, env);
  const out = await callWithRetry(parts, WORDS_SCHEMA, apiKey, model);
  await record(out.cost, ledger, env);
  const words = cleanWords(out.json?.words);
  if (!words.length) throw new Error("gemini returned no words");
  return words;
}

/** an upload, read: {label, words}. The label names the seed in the garden;
    the words are its first associations. Exported for scripts/serve.mjs. */
export async function describeUpload(body, env = process.env) {
  const apiKey = requireKey(env);
  const img = imagePart(body);
  if (!img) {
    const err = new Error("image required (data:image/jpeg|png|webp;base64)");
    err.status = 400;
    throw err;
  }
  const model = env.GROW_MODEL || DEFAULT_MODEL;
  const ledger = await guard(0.01, env);
  const out = await callWithRetry([{ text: describePrompt(3) }, img], DESCRIBE_SCHEMA, apiKey, model);
  await record(out.cost, ledger, env);
  const label = String(out.json?.label ?? "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 40);
  const words = cleanWords(out.json?.words);
  if (!label || !words.length) throw new Error("gemini returned no reading of the image");
  return { label, words };
}

/** One door for both jobs: an image with no term is a describe, everything
    else is a grow. Both servers (vercel handler + serve.mjs) route through
    this, so the contract cannot drift between them. */
export function handleGrow(body, env = process.env) {
  const hasTerm = !!String(body?.term ?? "").trim();
  if (!hasTerm && (body?.image || body?.context?.image)) return describeUpload(body, env);
  return growWords(body, env).then((words) => ({ words }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  try {
    res.status(200).json(await handleGrow(req.body ?? {}));
  } catch (e) {
    /* 400 = caller's fault, 503 = we're not configured, everything else
       (including upstream failures) = 502. The client treats any of them as
       "fall back to canned". */
    const status = e.status === 400 ? 400 : e.status === 503 ? 503 : 502;
    res.status(status).json({ error: String(e.message ?? e).slice(0, 300) });
  }
}
