/* =============== the grow engine =============== */

/* One gesture in the garden asks the same question every time: given this
   word, what else might it be? Everything the AI contributes to the product
   comes through this interface, which is why it is worth naming rather than
   leaving as a function called growFor buried in a page.

   Two properties it has to keep:

   - It proposes, it never selects. grow() returns candidates. Nothing here
     lights a word, ranks one above another, or decides what travels. That is
     the user's move, and handing it to the model would quietly turn the
     garden back into a form.

   - It degrades to canned. If the network is down or no key is configured the
     garden still grows, because a demo that dies without an API key is not a
     demo. The LLM engine falls back rather than throwing. */

import type { Ingredient } from "./weave.js";

export interface Sprout {
  text: string;
  kind: "word" | "image";
  img?: string;
}

export interface GrowContext {
  /* the reference the lineage started from, e.g. "Betta Fish" */
  seed?: string;
  /* the path from seed to this term: the thread the user has been pulling */
  lineage?: string[];
  /* terms already on the board. Repeating one is a wasted proposal. */
  avoid?: string[];
  /* the user's own uploaded reference, as a (client-shrunk) data URL. Only
     set when growing from an upload seed: the endpoint attaches it so the
     associations come from the pixels, not from the phrase "your image". */
  image?: string;
}

export interface GrowEngine {
  name: string;
  grow(term: string, ctx?: GrowContext): Promise<Sprout[]>;
}

/* ---- vocabulary (was inline in start.html) ---- */

export const MOODPIX = [
  "images/case01.png", "images/case03.png", "images/case08.png",
  "images/case11.png", "images/ref04.png",
];

const POOL = [
  "shimmer", "gossamer", "layered folds", "asymmetry", "translucence",
  "frayed edge", "sharp pleats", "iridescence", "raw seam", "bias cut",
  "organic curve", "negative space", "gradient wash", "structured shell",
  "fluid drape", "matte skin", "hand-stitched", "exaggerated hip",
  "monochrome", "backlit glow",
];

const ASSOC: Record<string, string[]> = {
  "betta fins":   ["iridescent", "flow", "translucent"],
  "orchid":       ["petals", "symmetry", "bloom"],
  "calla lily":   ["curve", "minimal", "ivory"],
  "jellyfish":    ["translucent", "drift", "tendrils"],
  "your image":   ["mood", "surface", "form"],
  "iridescent":   ["oil-slick sheen", "prismatic", "beetle-wing"],
  "translucent":  ["organza veil", "backlit glow", "gossamer"],
  "flow":         ["liquid drape", "ripple hem", "weightless"],
  "petals":       ["layered folds", "furled edge", "blush ombre"],
  "symmetry":     ["mirrored panels", "central seam", "quiet balance"],
  "bloom":        ["unfurling", "radial pleats", "opening form"],
  "curve":        ["sculptural fold", "spiral wrap", "single line"],
  "minimal":      ["clean seam", "negative space", "one gesture"],
  "ivory":        ["bone white", "warm cream", "soft matte"],
  "drift":        ["floating hem", "suspended", "slow motion"],
  "tendrils":     ["trailing threads", "fringe", "tentacle drape"],
  "mood":         ["undertone", "atmosphere", "half-light"],
  "surface":      ["ridged", "woven grain", "tactile relief"],
  "form":         ["silhouette", "structured shell", "negative space"],
};

function assocFor(term: string): string[] {
  const key = (term || "").toLowerCase().trim();
  const known = ASSOC[key];
  if (known) return known.slice();
  /* unknown term: deterministic walk through the pool, so the same word always
     grows the same way within a session and the garden feels like a place */
  let s = 0;
  for (const c of key) s += c.charCodeAt(0);
  const out: string[] = [];
  for (let i = 0; i < 3; i++) out.push(POOL[(s + i * 7) % POOL.length]!);
  return out;
}

/* ---- canned ---- */

export function cannedEngine(): GrowEngine {
  return {
    name: "canned",
    async grow(term, ctx) {
      const avoid = new Set((ctx?.avoid ?? []).map((t) => t.toLowerCase()));
      const base = assocFor(term).filter((t) => !avoid.has(t.toLowerCase()));

      /* top up from the pool if the lineage has already used the good ones,
         so a branch never dead-ends just because the user went deep */
      if (base.length < 2) {
        for (const t of POOL) {
          if (base.length >= 3) break;
          if (!avoid.has(t.toLowerCase()) && !base.includes(t)) base.push(t);
        }
      }

      const n = 2 + Math.floor(Math.random() * 2);
      const out: Sprout[] = base
        .slice(0, Math.max(2, Math.min(4, n)))
        .map((text) => ({ text, kind: "word" as const }));

      if (Math.random() < 0.55) {
        out.push({
          text: "",
          kind: "image",
          img: MOODPIX[Math.floor(Math.random() * MOODPIX.length)]!,
        });
      }
      return out;
    },
  };
}

/* ---- llm ---- */

export interface LLMConfig {
  /* your own endpoint. Never put a provider key in the page: this should point
     at something you control that holds the key server-side. */
  endpoint: string;
  model?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /* how many words to ask for. Three is the garden's rhythm. */
  n?: number;
}

/* The brief the model is held to. It is written as a constraint on behaviour,
   not a persona, because the failure mode we care about is the model being
   tasteful and decisive when its job is to be generative and uncommitted. */
export function proposePrompt(term: string, ctx: GrowContext = {}, n = 3): string {
  const lineage = (ctx.lineage ?? []).join(" -> ");
  const avoid = (ctx.avoid ?? []).slice(0, 40).join(", ");
  return [
    `You are helping a fashion designer free-associate. They are pulling on the word "${term}".`,
    ctx.image ? "Their own reference image is attached: ground every association in what is actually visible in it." : "",
    lineage ? `They reached it by: ${lineage}.` : "",
    `Offer ${n} associations that could each become a garment decision: a texture, a shape, a colour, a feeling, a construction detail.`,
    "Rules:",
    "- Two to four words each. Concrete enough to sew, loose enough to argue with.",
    "- Do not rank them, explain them, or pick a favourite. The designer decides.",
    "- Vary the register: do not return three textures. Range across the material and the emotional.",
    "- No brand names, no season names, no trend language.",
    avoid ? `- Already on their board, do not repeat: ${avoid}.` : "",
    `Return JSON only: {"words": ["...", "...", "..."]}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* The brief for reading an upload. Same contract as proposePrompt: candidates
   only, the user curates. The label names the seed so the garden (and every
   `from` lineage downstream) can stop saying "your image". Built server-side
   from this shared source, exactly like proposePrompt. */
export function describePrompt(n = 3): string {
  return [
    "A fashion designer just uploaded this image as a reference. Look at it.",
    `Return a label and ${n} associations, as JSON.`,
    '- label: 2 to 4 lowercase words naming what the image actually shows ("rusted iron gate", "peony in rain"). No "photo of", no guessing beyond the frame.',
    "- words: associations that could each become a garment decision: a texture, a shape, a colour, a feeling, a construction detail. Grounded in what is visible, two to four words each.",
    "- Do not rank or explain. Vary the register: not three textures.",
    "- No brand names, no season names, no trend language.",
    `Return JSON only: {"label": "...", "words": ["...", "...", "..."]}`,
  ].join("\n");
}

export function llmEngine(cfg: LLMConfig, fallback: GrowEngine = cannedEngine()): GrowEngine {
  return {
    name: "llm",
    async grow(term, ctx) {
      const n = cfg.n ?? 3;
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs ?? 6000);
      try {
        const res = await fetch(cfg.endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", ...(cfg.headers ?? {}) },
          body: JSON.stringify({
            model: cfg.model,
            term,
            context: ctx ?? {},
            prompt: proposePrompt(term, ctx ?? {}, n),
          }),
          signal: ctl.signal,
        });
        if (!res.ok) throw new Error("grow endpoint " + res.status);
        const data = (await res.json()) as { words?: unknown };
        const words = Array.isArray(data.words) ? data.words : [];
        const out: Sprout[] = words
          .filter((w): w is string => typeof w === "string" && !!w.trim())
          .slice(0, 4)
          .map((w) => ({ text: w.trim(), kind: "word" as const }));
        if (!out.length) throw new Error("grow endpoint returned no words");
        return out;
      } catch {
        /* the garden keeps growing */
        return fallback.grow(term, ctx);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/* ---- generated imagery ---- */

export interface GrowImageInput {
  kind: "mood" | "render" | "sketch";
  /* mood */
  term?: string;
  lineage?: string[];
  /* render/sketch: the design formula as ingredients — the server weaves the
     phrasing through src/weave.ts, so strings and items are both accepted */
  formula?: {
    silhouette?: string;
    pose?: string;
    colors?: Array<string | Ingredient>;
    form?: Array<string | Ingredient>;
    surface?: Array<string | Ingredient>;
    mood?: Array<string | Ingredient>;
    notes?: Array<string | Ingredient>;
    controls?: string[];
    fabric?: string;
  };
  /* sketch: the closed-vocabulary recipe the tile was drawn from */
  recipe?: Record<string, unknown>;
}

export interface GrowImageConfig {
  endpoint?: string;
  timeoutMs?: number;
  /* longest edge after client-side downscale. The model returns ~1024px PNGs
     of 2MB+; a garden tile or a 220px preview doesn't need that, and a lit
     image has to fit through the pocket (localStorage) without eating it. */
  maxPx?: number;
}

function decodeImg(dataUrl: string): Promise<HTMLImageElement> {
  const img = new Image();
  return new Promise((res, rej) => {
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("decode failed"));
    img.src = dataUrl;
  });
}

function scaleToJpeg(img: HTMLImageElement, maxPx: number): string | null {
  const scale = Math.min(1, maxPx / Math.max(img.width, img.height, 1));
  if (scale >= 1) return null;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * scale));
  c.height = Math.max(1, Math.round(img.height * scale));
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

async function shrinkDataUrl(dataUrl: string, maxPx: number): Promise<string> {
  try {
    if (typeof document === "undefined") return dataUrl;
    return scaleToJpeg(await decodeImg(dataUrl), maxPx) ?? dataUrl;
  } catch {
    return dataUrl;
  }
}

/** An upload, made safe to keep: decode-checked (a HEIC or a mislabeled file
    fails here instead of becoming an invisible seed), shrunk to a working
    copy the endpoint can take and a thumb the pocket can afford. null means
    the browser cannot read this file — tell the user, don't plant it. */
export async function prepRefImage(
  dataUrl: string
): Promise<{ src: string; thumb: string } | null> {
  try {
    if (typeof document === "undefined") return null;
    const img = await decodeImg(dataUrl);
    if (!img.width || !img.height) return null;
    return {
      src: scaleToJpeg(img, 768) ?? dataUrl,
      thumb: scaleToJpeg(img, 280) ?? dataUrl,
    };
  } catch {
    return null;
  }
}

/** What the model sees in an upload: a short label naming it plus the first
    associations, or null on ANY failure — offline, no key, budget spent.
    Callers keep their canned behaviour on null, so the upload never breaks. */
export async function describeImage(
  image: string,
  cfg: { endpoint?: string; timeoutMs?: number } = {}
): Promise<{ label: string; words: string[] } | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs ?? 15000);
  try {
    const res = await fetch(cfg.endpoint ?? "/api/grow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image }),
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { label?: unknown; words?: unknown };
    const label = typeof data.label === "string" ? data.label.trim().slice(0, 40) : "";
    const words = Array.isArray(data.words)
      ? data.words
          .filter((w): w is string => typeof w === "string" && !!w.trim())
          .map((w) => w.trim())
          .slice(0, 4)
      : [];
    if (!label || !words.length) return null;
    return { label, words };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** One generated image as a data URL, or null on ANY failure — no key, no
    endpoint, budget cap reached, timeout. Callers fall back to canned
    imagery, so a null here never blanks the page. */
export async function growImage(
  input: GrowImageInput,
  cfg: GrowImageConfig = {}
): Promise<string | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs ?? 30000);
  try {
    const res = await fetch(cfg.endpoint ?? "/api/image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { image?: unknown };
    if (typeof data.image !== "string" || !data.image.startsWith("data:image")) return null;
    return await shrinkDataUrl(data.image, cfg.maxPx ?? 768);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ---- facade ---- */

let engine: GrowEngine = cannedEngine();

export function setEngine(e: GrowEngine): void {
  engine = e;
}

export function currentEngine(): string {
  return engine.name;
}

/** Grow from a term. This is the only call sites should need. */
export function grow(term: string, ctx?: GrowContext): Promise<Sprout[]> {
  return engine.grow(term, ctx);
}
