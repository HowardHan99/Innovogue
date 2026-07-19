/* =============== /api/image =============== */

/* Three image jobs, one endpoint, all budget-gated:

   kind:"mood"    a small atmospheric textile study for the association
                  garden — the image sprouts that used to come from the
                  canned MOODPIX pool can now be grown for the word itself.
   kind:"render"  the canvas preview: the user's design formula (silhouette,
                  pose, adopted readings, their own controls) rendered as a
                  single garment. This is the "generate preview" leg of the
                  three-page loop.
   kind:"sketch"  one variation tile: a /api/vary recipe drawn as a clean
                  croquis illustration in the sketch grid's own visual
                  language. Abstract but never scribbly, and physically a
                  wearable garment. The local SVG stays underneath as the
                  instant placeholder and the offline fallback.

   Same rule as /api/grow: the model proposes, the user curates. A render is
   one candidate the user can keep or re-roll, never "the answer". Prompts
   are built server-side from structured fields; free-text from the client is
   length-capped and never interpreted as instructions to this endpoint.
   The render brief itself comes from src/weave.ts (via the generated
   _weave.mjs), the same code that writes HOW IT READS in the drawer, so the
   user has already read the exact sentences the model is about to get.

   Images return as data URLs. No storage, nothing retained server-side; if
   the user lights a mood image it travels in their pocket like any other
   node. Failure or a spent budget answers 4xx/5xx and the client falls back
   to canned imagery, so the garden never goes blank. */

import { guard, record, PRICE } from "./_budget.mjs";
import { AXES } from "./vary.mjs";
import { asFormula, weaveSentences } from "./_weave.mjs";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash-image";

const cap = (s, n) => String(s ?? "").trim().slice(0, n);
const capList = (a, n, len) =>
  Array.isArray(a)
    ? a.filter((x) => typeof x === "string").map((x) => x.trim().slice(0, len)).filter(Boolean).slice(0, n)
    : [];

function moodPrompt(term, lineage) {
  const thread = lineage.length ? ` It was reached through: ${lineage.join(", ")}.` : "";
  return [
    `An atmospheric reference photograph for a fashion designer's mood board, evoking the idea of "${term}".${thread}`,
    "Close-up material or nature study: fabric, surface, light, or organic texture. Muted, painterly, softly lit.",
    "No people, no faces, no text, no logos, no garments on models. It should feel like a fragment of inspiration, not a finished design.",
  ].join(" ");
}

/* the woven brief (the same sentences the drawer shows as HOW IT READS),
   framed by the camera directions only the model needs */
function renderPrompt(f) {
  return [
    "Fashion editorial photograph: exactly one long dress, full length in frame, presented on a simplified faceless figure in a quiet studio against a plain warm-grey backdrop.",
    "The designer's brief follows. Every named ingredient in it must be visibly present and legible in the garment, translated into cut, drape, surface or color rather than implied:",
    ...weaveSentences(f),
    "Editorial lookbook lighting, softly graded. No human face, no text, no watermark, no brand marks.",
  ].join(" ");
}

/* recipe -> a croquis sketch prompt. The words are locked to the same closed
   vocabulary /api/vary emits, so the model draws the recipe the user picked,
   not a free improvisation. Style is pinned to the sketch grid's existing
   look: clean ivory line on near-black, one accent, abstract but composed. */
const HEXRE = /^#[0-9a-fA-F]{6}$/;
function sketchPrompt(f, r) {
  const ax = (axis, fb) => (AXES[axis].includes(r?.[axis]) ? r[axis] : fb);
  const neckline = ax("neckline", "scoop"), sleeve = ax("sleeve", "none");
  const hem = ax("hem", "straight"), volume = ax("volume", "soft");
  const motif = ax("motif", "none"), density = ax("density", "medium");
  const accentOn = ax("accentOn", "waist");
  const p = r?.palette ?? {};
  const hex = (c, fb) => (typeof c === "string" && HEXRE.test(c.trim()) ? c.trim() : fb);
  const base = hex(p.base, "#D5A9BC"), wash = hex(p.wash, "#EFE6CF"), accent = hex(p.accent, "#FF8FC2");

  const NECK = { v: "a deep V neckline", scoop: "a soft rounded scoop neckline", square: "a clean square neckline", high: "a high close-to-the-neck neckline", strapless: "a strapless straight-across bodice" };
  const SLEEVE = { none: "sleeveless", cap: "with small cap sleeves", puff: "with soft puff sleeves", long: "with slim full-length sleeves" };
  const HEM = { straight: "a straight floor-length hem", asymmetric: "an asymmetric diagonal hem", scalloped: "a gently scalloped hem", highlow: "a high-low hem, shorter at the front" };
  const VOL = { slim: "slim, close to the body", soft: "softly flared", full: "full and generous" };
  const MOTIF = { none: "", rays: "faint lines radiating from the waist seam", cracks: "a fine crackle veining", drops: "scattered teardrop shapes", petals: "overlapping petal shapes near the hem", specks: "a fine scatter of tiny specks" };
  const DENS = { sparse: "very sparse, barely there", medium: "quiet and even", dense: "dense but delicate" };

  const bits = [];
  bits.push(
    `A refined fashion croquis illustration of ONE ${f.silhouette ? f.silhouette.toLowerCase() + "-silhouette " : ""}long dress on a simplified faceless figure${f.pose ? ` in a ${f.pose.toLowerCase()} attitude` : ""}, drawn in clean, confident ivory ink line on a very dark, near-black charcoal board.`
  );
  bits.push(`The dress has ${NECK[neckline]}, ${SLEEVE[sleeve]}, ${HEM[hem]}; the skirt volume is ${VOL[volume]}.`);
  if (MOTIF[motif]) bits.push(`Surface: ${MOTIF[motif]}, ${DENS[density]}.`);
  bits.push(`The garment is filled with a muted flat wash from ${base} into ${wash}. Exactly one accent in ${accent}, placed at the ${accentOn === "neck" ? "neckline" : accentOn}; everything else stays quiet.`);
  if (f.controls.length) bits.push(`Hard constraints from the designer: ${f.controls.join(", ")}.`);
  bits.push(
    "Abstract and minimal, but never scribbly: no rough hatching, no messy construction lines, no splatter. Elegant flat illustration with generous negative space, like a couture lookbook sketch."
  );
  bits.push(
    "The garment must be physically plausible: a wearable one-piece construction, fabric draping under gravity like soft silk or chiffon, neckline and seams structurally consistent, nothing floating or impossible."
  );
  bits.push(
    "Background: one single uniform near-black charcoal tone (hex #14110F, almost black with the faintest warm undertone), identical from edge to edge. The image must read as light ivory drawing on a dark ground, NEVER dark lines on light or beige paper. No vignette, no spotlight, no lighting gradient, no paper texture, no border."
  );
  bits.push("Figure is a hint only: small head outline, no face, no hands detail. No text, no watermark, no logo, no photorealism.");
  return bits.join(" ");
}

function buildPrompt(body) {
  if (body?.kind === "sketch") {
    return { prompt: sketchPrompt(asFormula(body.formula), body.recipe ?? {}), aspect: "3:4" };
  }
  if (body?.kind === "render") {
    return { prompt: renderPrompt(asFormula(body.formula)), aspect: "3:4" };
  }
  const term = cap(body?.term, 60);
  if (!term) {
    const e = new Error("term required");
    e.status = 400;
    throw e;
  }
  return { prompt: moodPrompt(term, capList(body?.lineage, 6, 40)), aspect: "1:1" };
}

async function callImage(prompt, aspect, apiKey, model, withAspect) {
  const generationConfig = { responseModalities: ["IMAGE"] };
  if (withAspect) generationConfig.imageConfig = { aspectRatio: aspect };
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
  const part = (data?.candidates?.[0]?.content?.parts ?? []).find((p) => p?.inlineData?.data);
  if (!part) throw new Error("gemini returned no image");
  return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
}

/** body -> data URL. Exported for scripts/serve.mjs. */
export async function renderImage(body, env = process.env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    const e = new Error("GEMINI_API_KEY not configured");
    e.status = 503;
    throw e;
  }
  const { prompt, aspect } = buildPrompt(body);
  /* gate on worst case before spending, book flat image price after */
  const ledger = await guard(PRICE.image + 0.001, env);
  const model = env.GROW_IMAGE_MODEL || DEFAULT_MODEL;
  let image;
  try {
    image = await callImage(prompt, aspect, apiKey, model, true);
  } catch (e) {
    if (e.status === 400) image = await callImage(prompt, aspect, apiKey, model, false);
    else throw e;
  }
  await record(PRICE.image, ledger, env);
  return image;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  try {
    const image = await renderImage(req.body ?? {});
    res.status(200).json({ image });
  } catch (e) {
    const status = [400, 402, 503].includes(e.status) ? e.status : 502;
    res.status(status).json({ error: String(e.message ?? e).slice(0, 300) });
  }
}
