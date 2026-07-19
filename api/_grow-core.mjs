// src/grow.ts
var MOODPIX = [
  "images/case01.png",
  "images/case03.png",
  "images/case08.png",
  "images/case11.png",
  "images/ref04.png"
];
var POOL = [
  "shimmer",
  "gossamer",
  "layered folds",
  "asymmetry",
  "translucence",
  "frayed edge",
  "sharp pleats",
  "iridescence",
  "raw seam",
  "bias cut",
  "organic curve",
  "negative space",
  "gradient wash",
  "structured shell",
  "fluid drape",
  "matte skin",
  "hand-stitched",
  "exaggerated hip",
  "monochrome",
  "backlit glow"
];
var ASSOC = {
  "betta fins": ["iridescent", "flow", "translucent"],
  "orchid": ["petals", "symmetry", "bloom"],
  "calla lily": ["curve", "minimal", "ivory"],
  "jellyfish": ["translucent", "drift", "tendrils"],
  "your image": ["mood", "surface", "form"],
  "iridescent": ["oil-slick sheen", "prismatic", "beetle-wing"],
  "translucent": ["organza veil", "backlit glow", "gossamer"],
  "flow": ["liquid drape", "ripple hem", "weightless"],
  "petals": ["layered folds", "furled edge", "blush ombre"],
  "symmetry": ["mirrored panels", "central seam", "quiet balance"],
  "bloom": ["unfurling", "radial pleats", "opening form"],
  "curve": ["sculptural fold", "spiral wrap", "single line"],
  "minimal": ["clean seam", "negative space", "one gesture"],
  "ivory": ["bone white", "warm cream", "soft matte"],
  "drift": ["floating hem", "suspended", "slow motion"],
  "tendrils": ["trailing threads", "fringe", "tentacle drape"],
  "mood": ["undertone", "atmosphere", "half-light"],
  "surface": ["ridged", "woven grain", "tactile relief"],
  "form": ["silhouette", "structured shell", "negative space"]
};
function assocFor(term) {
  const key = (term || "").toLowerCase().trim();
  const known = ASSOC[key];
  if (known) return known.slice();
  let s = 0;
  for (const c of key) s += c.charCodeAt(0);
  const out = [];
  for (let i = 0; i < 3; i++) out.push(POOL[(s + i * 7) % POOL.length]);
  return out;
}
function cannedEngine() {
  return {
    name: "canned",
    async grow(term, ctx) {
      const avoid = new Set((ctx?.avoid ?? []).map((t) => t.toLowerCase()));
      const base = assocFor(term).filter((t) => !avoid.has(t.toLowerCase()));
      if (base.length < 2) {
        for (const t of POOL) {
          if (base.length >= 3) break;
          if (!avoid.has(t.toLowerCase()) && !base.includes(t)) base.push(t);
        }
      }
      const n = 2 + Math.floor(Math.random() * 2);
      const out = base.slice(0, Math.max(2, Math.min(4, n))).map((text) => ({ text, kind: "word" }));
      if (Math.random() < 0.55) {
        out.push({
          text: "",
          kind: "image",
          img: MOODPIX[Math.floor(Math.random() * MOODPIX.length)]
        });
      }
      return out;
    }
  };
}
function proposePrompt(term, ctx = {}, n = 3) {
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
    `Return JSON only: {"words": ["...", "...", "..."]}`
  ].filter(Boolean).join("\n");
}
function describePrompt(n = 3) {
  return [
    "A fashion designer just uploaded this image as a reference. Look at it.",
    `Return a label and ${n} associations, as JSON.`,
    '- label: 2 to 4 lowercase words naming what the image actually shows ("rusted iron gate", "peony in rain"). No "photo of", no guessing beyond the frame.',
    "- words: associations that could each become a garment decision: a texture, a shape, a colour, a feeling, a construction detail. Grounded in what is visible, two to four words each.",
    "- Do not rank or explain. Vary the register: not three textures.",
    "- No brand names, no season names, no trend language.",
    `Return JSON only: {"label": "...", "words": ["...", "...", "..."]}`
  ].join("\n");
}
function llmEngine(cfg, fallback = cannedEngine()) {
  return {
    name: "llm",
    async grow(term, ctx) {
      const n = cfg.n ?? 3;
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs ?? 6e3);
      try {
        const res = await fetch(cfg.endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", ...cfg.headers ?? {} },
          body: JSON.stringify({
            model: cfg.model,
            term,
            context: ctx ?? {},
            prompt: proposePrompt(term, ctx ?? {}, n)
          }),
          signal: ctl.signal
        });
        if (!res.ok) throw new Error("grow endpoint " + res.status);
        const data = await res.json();
        const words = Array.isArray(data.words) ? data.words : [];
        const out = words.filter((w) => typeof w === "string" && !!w.trim()).slice(0, 4).map((w) => ({ text: w.trim(), kind: "word" }));
        if (!out.length) throw new Error("grow endpoint returned no words");
        return out;
      } catch {
        return fallback.grow(term, ctx);
      } finally {
        clearTimeout(timer);
      }
    }
  };
}
function decodeImg(dataUrl) {
  const img = new Image();
  return new Promise((res, rej) => {
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("decode failed"));
    img.src = dataUrl;
  });
}
function scaleToJpeg(img, maxPx) {
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
async function shrinkDataUrl(dataUrl, maxPx) {
  try {
    if (typeof document === "undefined") return dataUrl;
    return scaleToJpeg(await decodeImg(dataUrl), maxPx) ?? dataUrl;
  } catch {
    return dataUrl;
  }
}
async function prepRefImage(dataUrl) {
  try {
    if (typeof document === "undefined") return null;
    const img = await decodeImg(dataUrl);
    if (!img.width || !img.height) return null;
    return {
      src: scaleToJpeg(img, 768) ?? dataUrl,
      thumb: scaleToJpeg(img, 280) ?? dataUrl
    };
  } catch {
    return null;
  }
}
async function describeImage(image, cfg = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs ?? 15e3);
  try {
    const res = await fetch(cfg.endpoint ?? "/api/grow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image }),
      signal: ctl.signal
    });
    if (!res.ok) return null;
    const data = await res.json();
    const label = typeof data.label === "string" ? data.label.trim().slice(0, 40) : "";
    const words = Array.isArray(data.words) ? data.words.filter((w) => typeof w === "string" && !!w.trim()).map((w) => w.trim()).slice(0, 4) : [];
    if (!label || !words.length) return null;
    return { label, words };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function growImage(input, cfg = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs ?? 3e4);
  try {
    const res = await fetch(cfg.endpoint ?? "/api/image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: ctl.signal
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.image !== "string" || !data.image.startsWith("data:image")) return null;
    return await shrinkDataUrl(data.image, cfg.maxPx ?? 768);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
var engine = cannedEngine();
function setEngine(e) {
  engine = e;
}
function currentEngine() {
  return engine.name;
}
function grow(term, ctx) {
  return engine.grow(term, ctx);
}
export {
  MOODPIX,
  cannedEngine,
  currentEngine,
  describeImage,
  describePrompt,
  grow,
  growImage,
  llmEngine,
  prepRefImage,
  proposePrompt,
  setEngine
};
