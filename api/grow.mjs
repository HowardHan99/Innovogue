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

import { proposePrompt } from "./_grow-core.mjs";
import { guard, record, PRICE } from "./_budget.mjs";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

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

async function callGemini(prompt, apiKey, model, withThinkingOff) {
  const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: { words: { type: "ARRAY", items: { type: "STRING" } } },
      required: ["words"],
    },
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
      contents: [{ role: "user", parts: [{ text: prompt }] }],
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
  const words = (JSON.parse(text)?.words ?? [])
    .filter((w) => typeof w === "string")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w && w.length <= 40)
    .slice(0, 4);
  if (!words.length) throw new Error("gemini returned no words");
  const u = data?.usageMetadata ?? {};
  const cost =
    (u.promptTokenCount || 0) * PRICE.textIn +
    ((u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0)) * PRICE.textOut;
  return { words, cost };
}

/** term + context -> up to 4 candidate words. Exported for scripts/serve.mjs. */
export async function growWords(body, env = process.env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error("GEMINI_API_KEY not configured");
    err.status = 503;
    throw err;
  }
  const { term, context } = sanitize(body);
  if (!term) {
    const err = new Error("term required");
    err.status = 400;
    throw err;
  }
  const prompt = proposePrompt(term, context, 3);
  const model = env.GROW_MODEL || DEFAULT_MODEL;
  /* worst case for one grow call is well under a cent; gate on that, then
     book what the response actually reports */
  const ledger = await guard(0.005, env);
  let out;
  try {
    out = await callGemini(prompt, apiKey, model, true);
  } catch (e) {
    /* an older or lite model may reject thinkingConfig — retry plain once */
    if (e.status === 400) out = await callGemini(prompt, apiKey, model, false);
    else throw e;
  }
  await record(out.cost, ledger, env);
  return out.words;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  try {
    const words = await growWords(req.body ?? {});
    res.status(200).json({ words });
  } catch (e) {
    /* 400 = caller's fault, 503 = we're not configured, everything else
       (including upstream failures) = 502. The client treats any of them as
       "fall back to canned". */
    const status = e.status === 400 ? 400 : e.status === 503 ? 503 : 502;
    res.status(status).json({ error: String(e.message ?? e).slice(0, 300) });
  }
}
