// src/weave.ts
var READ_PHRASES = {
  Pattern: {
    "all-over, tiny": "as a tiny all-over motif",
    "hem-heavy, large": "as large motifs massing toward the hem",
    "one bold placement": "as one bold placement on a quiet ground",
    "faded, ghosted": "faded to a ghost of itself",
    "clustered at bodice": "clustered at the bodice and thinning below"
  },
  Silhouette: {
    literal: "taken literally",
    exaggerated: "exaggerated into drama",
    whispered: "kept to a whisper",
    "asymmetric take": "carried on one side only",
    "structured, sharp": "hardened into sharp structure"
  },
  Color: {
    dominant: "flooding the dress as its main field",
    "as an accent": "held to a single accent",
    "washed & faded": "washed and faded",
    "in blocks": "set in clean blocks",
    "only at the hem": "pooling only at the hem"
  },
  Symbolic: {
    romantic: "read romantically",
    stark: "read starkly",
    playful: "read playfully",
    solemn: "read solemnly",
    "barely-there": "kept barely there"
  },
  Custom: {
    "as written": "taken exactly as written",
    amplified: "amplified",
    quiet: "kept quiet"
  }
};
function readingPhrase(cat, read) {
  return READ_PHRASES[cat]?.[read] ?? read;
}
var capStr = (s, n) => String(s ?? "").trim().slice(0, n);
var capList = (a, n, len) => Array.isArray(a) ? a.filter((x) => typeof x === "string").map((x) => x.trim().slice(0, len)).filter(Boolean).slice(0, n) : [];
function asIngredient(x) {
  if (typeof x === "string") {
    const val2 = x.trim().slice(0, 80);
    return val2 ? { val: val2, source: "", reads: [] } : null;
  }
  if (!x || typeof x !== "object") return null;
  const o = x;
  const val = capStr(o.val, 80);
  if (!val) return null;
  return { val, source: capStr(o.source, 40), reads: capList(o.reads, 4, 40) };
}
function asFormula(raw) {
  const f = raw && typeof raw === "object" ? raw : {};
  const ings = (a, n) => Array.isArray(a) ? a.map(asIngredient).filter((i) => !!i).slice(0, n) : [];
  return {
    silhouette: capStr(f.silhouette, 24),
    pose: capStr(f.pose, 24),
    colors: ings(f.colors, 6),
    form: ings(f.form, 6),
    surface: ings(f.surface, 6),
    mood: ings(f.mood, 6),
    notes: ings(f.notes, 6),
    controls: capList(f.controls, 8, 40),
    fabric: capStr(f.fabric, 40)
  };
}
var listJoin = (xs) => xs.length <= 1 ? xs[0] ?? "" : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
function ingredientPhrase(cat, ing, valText) {
  const src = ing.source && ing.source.toLowerCase() !== "you" ? ` (from ${ing.source})` : "";
  const reads = (ing.reads ?? []).map((r) => readingPhrase(cat, r));
  return (valText ?? ing.val) + src + (reads.length ? ", " + listJoin(reads) : "");
}
function weaveSentences(f, opts = {}) {
  const strong = opts.strong ?? ((t) => t);
  const ph = (cat) => (ing) => ingredientPhrase(cat, ing, opts.chip ? opts.chip(ing, cat) : void 0);
  const out = [];
  const sil = (f.silhouette ?? "").trim().toLowerCase();
  const art = /^[aeioux]/.test(sil) ? "An" : "A";
  let open = sil ? `${art} ${strong(sil)} long dress` : "A long dress";
  if (f.pose) open += ` on a ${strong(f.pose.trim().toLowerCase())} figure`;
  out.push(open + ".");
  if (f.form.length) out.push(`Its shape takes after ${listJoin(f.form.map(ph("Silhouette")))}.`);
  if (f.surface.length) out.push(`The surface carries ${listJoin(f.surface.map(ph("Pattern")))}.`);
  if (f.colors.length) out.push(`Color comes in as ${listJoin(f.colors.map(ph("Color")))}.`);
  out.push(`Cut in ${f.fabric && f.fabric.trim() ? f.fabric.trim() : "soft silk or chiffon"}.`);
  if (f.mood.length) out.push(`It speaks of ${listJoin(f.mood.map(ph("Symbolic")))}.`);
  if (f.notes.length) out.push(`In the designer's own words: ${f.notes.map(ph("Custom")).join("; ")}.`);
  if (f.controls.length) out.push(`Non-negotiable: ${strong(f.controls.join(", "))}.`);
  return out;
}
export {
  asFormula,
  asIngredient,
  ingredientPhrase,
  readingPhrase,
  weaveSentences
};
