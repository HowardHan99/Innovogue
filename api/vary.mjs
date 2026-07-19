/* =============== /api/vary =============== */

/* One cheap text call that makes "Generate variations" mean something: the
   user's design formula goes in, four DISTINCT sketch recipes come out, and
   the canvas draws them locally as croquis line sketches. No image tokens
   are spent here — this is the free layer between the formula and the one
   expensive /api/image render.

   Same contract as /api/grow: the model proposes, the user curates (pick /
   reroll / ignore). Same posture too: the prompt is built server-side from
   length-capped structured fields, every reply field is validated against a
   closed vocabulary before it reaches the client, and any failure lets the
   client fall back to its local expansion, so the button never dies. */

import { guard, record, PRICE } from "./_budget.mjs";
import { asFormula, ingredientPhrase } from "./_weave.mjs";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

/* the closed vocabulary the sketch renderer understands. anything outside
   these lists is dropped, so the model cannot steer the client. */
export const AXES = {
  neckline: ["v", "scoop", "square", "high", "strapless"],
  sleeve: ["none", "cap", "puff", "long"],
  hem: ["straight", "asymmetric", "scalloped", "highlow"],
  volume: ["slim", "soft", "full"],
  motif: ["none", "rays", "cracks", "drops", "petals", "specks"],
  density: ["sparse", "medium", "dense"],
  accentOn: ["waist", "neck", "sleeve", "hem"],
};

const cap = (s, n) => String(s ?? "").trim().slice(0, n);

/* the brief speaks the same woven language as the drawer and /api/image
   (src/weave.ts): readings arrive translated, origins ride along */
function varyPrompt(f) {
  const line = (k, v) => (v && v.length ? `- ${k}: ${Array.isArray(v) ? v.join("; ") : v}` : "");
  const wov = (cat, a) => a.map((i) => ingredientPhrase(cat, i));
  const brief = [
    line("silhouette", f.silhouette),
    line("pose", f.pose),
    line("colors", wov("Color", f.colors)),
    line("form", wov("Silhouette", f.form)),
    line("surface", wov("Pattern", f.surface)),
    line("mood", wov("Symbolic", f.mood)),
    line("fabric", f.fabric),
    line("designer notes", wov("Custom", f.notes)),
    line("hard constraints", f.controls),
  ].filter(Boolean).join("\n");
  return [
    "You are a fashion designer expanding ONE dress formula into FOUR distinct sketch variations for a croquis board.",
    "The formula, from the designer's canvas:",
    brief || "- (open brief: a long dress)",
    "",
    "Return exactly 4 variations. For each, pick one value per axis:",
    `neckline: ${AXES.neckline.join(" | ")}`,
    `sleeve: ${AXES.sleeve.join(" | ")}`,
    `hem: ${AXES.hem.join(" | ")}`,
    `volume: ${AXES.volume.join(" | ")}`,
    `motif (surface pattern): ${AXES.motif.join(" | ")}`,
    `density (of the motif): ${AXES.density.join(" | ")}`,
    `accentOn (where the single accent color lands): ${AXES.accentOn.join(" | ")}`,
    'palette: base, wash, accent as 6-digit hex strings like "#B76E79", never color names. Muted, low-saturation fashion tones that read on a near-black board and agree with the color words. Never purple unless the formula asks for it.',
    'note: a fragment of AT MOST 9 words (not a sentence) on what this variation emphasizes, quoting the reading it leans on, e.g. scoop + soft volume, leans "romantic".',
    "",
    "The four must differ on structure (neckline, hem, sleeve or volume), not only on palette.",
    "If a mood word suggests restraint (stark, solemn, barely-there), let at least one variation go minimal: motif none or sparse.",
    "strapless forbids sleeves other than none.",
  ].join("\n");
}

/* "#B76E79" | "B76E79" | "#b7e" -> "#B76E79"; anything else -> null */
function normHex(c) {
  let s = String(c ?? "").trim().replace(/^#?/, "#");
  if (/^#[0-9a-fA-F]{3}$/.test(s)) s = "#" + [...s.slice(1)].map((ch) => ch + ch).join("");
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : null;
}
/* the axes are the substance — reject on those. palette is auxiliary: a model
   that answers "blush" instead of hex gets the house palette, not a veto. */
const FALLBACK_PALETTE = { base: "#D5A9BC", wash: "#EFE6CF", accent: "#FF8FC2" };
function validate(v) {
  if (!v || typeof v !== "object") return null;
  const out = {};
  for (const [axis, allowed] of Object.entries(AXES)) {
    const val = String(v[axis] ?? "").trim().toLowerCase();
    if (!allowed.includes(val)) return null;
    out[axis] = val;
  }
  if (out.neckline === "strapless") out.sleeve = "none";
  if (out.accentOn === "sleeve" && out.sleeve === "none") out.accentOn = "waist";
  const p = v.palette ?? {};
  const trio = [normHex(p.base), normHex(p.wash), normHex(p.accent)];
  out.palette = trio.every(Boolean)
    ? { base: trio[0], wash: trio[1], accent: trio[2] }
    : { ...FALLBACK_PALETTE };
  /* trim to a caption-sized fragment on a word boundary */
  let note = cap(v.note, 200);
  if (note.length > 70) note = note.slice(0, 70).replace(/\s+\S*$/, "") + "…";
  out.note = note;
  return out;
}

async function callGemini(prompt, apiKey, model, withThinkingOff) {
  const axisSchema = (key) => ({ type: "STRING", enum: AXES[key] });
  const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        variations: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              neckline: axisSchema("neckline"),
              sleeve: axisSchema("sleeve"),
              hem: axisSchema("hem"),
              volume: axisSchema("volume"),
              motif: axisSchema("motif"),
              density: axisSchema("density"),
              accentOn: axisSchema("accentOn"),
              palette: {
                type: "OBJECT",
                properties: {
                  base: { type: "STRING", description: "6-digit hex like #B76E79, never a color name" },
                  wash: { type: "STRING", description: "6-digit hex like #EFE6CF, never a color name" },
                  accent: { type: "STRING", description: "6-digit hex like #FF8FC2, never a color name" },
                },
                required: ["base", "wash", "accent"],
              },
              note: { type: "STRING", description: "fragment, 9 words max, what this variation emphasizes" },
            },
            required: ["neckline", "sleeve", "hem", "volume", "motif", "density", "accentOn", "palette", "note"],
          },
        },
      },
      required: ["variations"],
    },
    /* variation wants spread, but the schema keeps it on the rails */
    temperature: 1.0,
    maxOutputTokens: 1200,
  };
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
  const variations = (JSON.parse(text)?.variations ?? [])
    .map(validate)
    .filter(Boolean)
    .slice(0, 4);
  if (!variations.length) throw new Error("gemini returned no usable variations");
  const u = data?.usageMetadata ?? {};
  const cost =
    (u.promptTokenCount || 0) * PRICE.textIn +
    ((u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0)) * PRICE.textOut;
  return { variations, cost };
}

/** formula -> up to 4 validated variation recipes. Exported for scripts/serve.mjs. */
export async function varyFormula(body, env = process.env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error("GEMINI_API_KEY not configured");
    err.status = 503;
    throw err;
  }
  const prompt = varyPrompt(asFormula(body?.formula));
  const model = env.GROW_MODEL || DEFAULT_MODEL;
  /* a page of JSON from flash is well under a cent; gate on that, book actual */
  const ledger = await guard(0.01, env);
  let out;
  try {
    out = await callGemini(prompt, apiKey, model, true);
  } catch (e) {
    /* an older or lite model may reject thinkingConfig — retry plain once */
    if (e.status === 400) out = await callGemini(prompt, apiKey, model, false);
    else throw e;
  }
  await record(out.cost, ledger, env);
  return out.variations;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  try {
    const variations = await varyFormula(req.body ?? {});
    res.status(200).json({ variations });
  } catch (e) {
    /* 400 caller, 402 budget, 503 unconfigured, else 502 — the client treats
       every one of them as "expand locally instead" */
    const status = [400, 402, 503].includes(e.status) ? e.status : 502;
    res.status(status).json({ error: String(e.message ?? e).slice(0, 300) });
  }
}
