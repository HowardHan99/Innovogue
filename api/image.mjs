/* =============== /api/image =============== */

/* Two image jobs, one endpoint, both budget-gated:

   kind:"mood"    a small atmospheric textile study for the association
                  garden — the image sprouts that used to come from the
                  canned MOODPIX pool can now be grown for the word itself.
   kind:"render"  the canvas preview: the user's design formula (silhouette,
                  pose, adopted readings, their own controls) rendered as a
                  single garment. This is the "generate preview" leg of the
                  three-page loop.

   Same rule as /api/grow: the model proposes, the user curates. A render is
   one candidate the user can keep or re-roll, never "the answer". Prompts
   are built server-side from structured fields; free-text from the client is
   length-capped and never interpreted as instructions to this endpoint.

   Images return as data URLs. No storage, nothing retained server-side; if
   the user lights a mood image it travels in their pocket like any other
   node. Failure or a spent budget answers 4xx/5xx and the client falls back
   to canned imagery, so the garden never goes blank. */

import { guard, record, PRICE } from "./_budget.mjs";

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

function renderPrompt(f) {
  const bits = [];
  bits.push(
    `A single ${f.silhouette ? f.silhouette.toLowerCase() + "-silhouette " : ""}long dress on a dress form mannequin${f.pose ? `, presented in a ${f.pose.toLowerCase()} attitude` : ""}, photographed in a quiet studio against a plain warm-grey backdrop.`
  );
  if (f.colors.length) bits.push(`Palette: ${f.colors.join(", ")}.`);
  if (f.form.length) bits.push(`The form follows ${f.form.join(", ")}.`);
  if (f.surface.length) bits.push(`The surface carries ${f.surface.join(", ")}.`);
  bits.push(`Fabric: soft silk or chiffon.`);
  if (f.mood.length) bits.push(`It should feel ${f.mood.join(" and ")}.`);
  if (f.notes.length) bits.push(`Designer's own notes: ${f.notes.join("; ")}.`);
  if (f.controls.length) bits.push(`Hard constraints from the designer: ${f.controls.join(", ")}.`);
  bits.push(
    "One garment only, full length in frame. Editorial lookbook lighting, softly graded. No human face, no text, no watermark, no brand marks."
  );
  return bits.join(" ");
}

function buildPrompt(body) {
  if (body?.kind === "render") {
    const f = body.formula ?? {};
    return {
      prompt: renderPrompt({
        silhouette: cap(f.silhouette, 24),
        pose: cap(f.pose, 24),
        colors: capList(f.colors, 6, 60),
        form: capList(f.form, 6, 60),
        surface: capList(f.surface, 6, 60),
        mood: capList(f.mood, 6, 60),
        notes: capList(f.notes, 6, 60),
        controls: capList(f.controls, 8, 40),
      }),
      aspect: "3:4",
    };
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
