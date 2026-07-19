/* =============== weave: ingredients -> language =============== */

/* One vocabulary, two mouths. The canvas speaks in ingredients: a word the
   user kept ("iridescent"), where it came from ("betta fins"), and how they
   chose to read it ("one bold placement"). Before this file every consumer
   re-flattened those into its own string soup: the drawer glued "val
   (reading)" pairs, /api/image joined them with commas, and the readings
   themselves, UI shorthand like "hem-heavy, large", reached the image model
   untranslated. The prompt read like a form dump, not a brief.

   This module is the single translation table. It turns each closed-
   vocabulary reading into the visual sentence it always meant, weaves an
   ingredient (value + origin + adopted readings) into one phrase, and
   composes the whole formula into prose. The drawer renders these sentences
   as HOW IT READS with live chips; /api/image and /api/vary import the same
   code through the generated api/_weave.mjs (npm run core). What the user
   reads in the form IS the brief the model gets, minus camera directions. */

export type WeaveCategory = "Pattern" | "Silhouette" | "Color" | "Symbolic" | "Custom";

export interface Ingredient {
  /* the word the user kept on the canvas */
  val: string;
  /* its origin ("betta fins", a garden word); "" when it is the user's own */
  source?: string;
  /* adopted readings, in the canvas' closed vocabulary */
  reads?: string[];
  /* client-only: the card uid, so the drawer can wire hover -> node */
  uid?: string;
  /* client-only: the card's category, for chip coloring */
  type?: string;
}

export interface WeaveFormula {
  silhouette?: string;
  pose?: string;
  colors: Ingredient[];
  form: Ingredient[];
  surface: Ingredient[];
  mood: Ingredient[];
  notes: Ingredient[];
  controls: string[];
  fabric?: string;
}

/* the canvas' closed reading vocabulary (READINGS in mvp_v6), translated
   into what each shorthand actually asks the garment to do. An unknown
   reading, a future axis or a user's own words, passes through as written. */
const READ_PHRASES: Record<WeaveCategory, Record<string, string>> = {
  Pattern: {
    "all-over, tiny": "as a tiny all-over motif",
    "hem-heavy, large": "as large motifs massing toward the hem",
    "one bold placement": "as one bold placement on a quiet ground",
    "faded, ghosted": "faded to a ghost of itself",
    "clustered at bodice": "clustered at the bodice and thinning below",
  },
  Silhouette: {
    literal: "taken literally",
    exaggerated: "exaggerated into drama",
    whispered: "kept to a whisper",
    "asymmetric take": "carried on one side only",
    "structured, sharp": "hardened into sharp structure",
  },
  Color: {
    dominant: "flooding the dress as its main field",
    "as an accent": "held to a single accent",
    "washed & faded": "washed and faded",
    "in blocks": "set in clean blocks",
    "only at the hem": "pooling only at the hem",
  },
  Symbolic: {
    romantic: "read romantically",
    stark: "read starkly",
    playful: "read playfully",
    solemn: "read solemnly",
    "barely-there": "kept barely there",
  },
  Custom: {
    "as written": "taken exactly as written",
    amplified: "amplified",
    quiet: "kept quiet",
  },
};

export function readingPhrase(cat: WeaveCategory, read: string): string {
  return READ_PHRASES[cat]?.[read] ?? read;
}

/* ---- the wire: length-capped, never interpreted ---- */

const capStr = (s: unknown, n: number): string => String(s ?? "").trim().slice(0, n);
const capList = (a: unknown, n: number, len: number): string[] =>
  Array.isArray(a)
    ? a
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim().slice(0, len))
        .filter(Boolean)
        .slice(0, n)
    : [];

/** One ingredient off the wire: the item shape, or the bare string older
    payloads sent. */
export function asIngredient(x: unknown): Ingredient | null {
  if (typeof x === "string") {
    const val = x.trim().slice(0, 80);
    return val ? { val, source: "", reads: [] } : null;
  }
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const val = capStr(o.val, 80);
  if (!val) return null;
  return { val, source: capStr(o.source, 40), reads: capList(o.reads, 4, 40) };
}

/** The whole formula off the wire. Both /api/image and /api/vary sanitize
    through this one door. */
export function asFormula(raw: unknown): WeaveFormula {
  const f = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const ings = (a: unknown, n: number): Ingredient[] =>
    Array.isArray(a) ? a.map(asIngredient).filter((i): i is Ingredient => !!i).slice(0, n) : [];
  return {
    silhouette: capStr(f.silhouette, 24),
    pose: capStr(f.pose, 24),
    colors: ings(f.colors, 6),
    form: ings(f.form, 6),
    surface: ings(f.surface, 6),
    mood: ings(f.mood, 6),
    notes: ings(f.notes, 6),
    controls: capList(f.controls, 8, 40),
    fabric: capStr(f.fabric, 40),
  };
}

/* ---- the weave ---- */

const listJoin = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? "") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];

/** "iridescent (from betta fins), as one bold placement on a quiet ground":
    one ingredient as one phrase. valText lets the drawer swap the raw value
    for a live chip without rewriting the grammar. */
export function ingredientPhrase(cat: WeaveCategory, ing: Ingredient, valText?: string): string {
  const src = ing.source && ing.source.toLowerCase() !== "you" ? ` (from ${ing.source})` : "";
  const reads = (ing.reads ?? []).map((r) => readingPhrase(cat, r));
  return (valText ?? ing.val) + src + (reads.length ? ", " + listJoin(reads) : "");
}

export interface WeaveOpts {
  /* wrap an ingredient's value; the drawer turns it into a hoverable chip */
  chip?: (ing: Ingredient, cat: WeaveCategory) => string;
  /* wrap the emphasized model words; the drawer bolds them */
  strong?: (text: string) => string;
}

/** The formula as prose, one sentence per aspect that is actually set. The
    server joins these into the render prompt; the drawer shows them as HOW
    IT READS. Keeping the composition here is the point: what the user reads
    and what the model is told can no longer drift apart. */
export function weaveSentences(f: WeaveFormula, opts: WeaveOpts = {}): string[] {
  const strong = opts.strong ?? ((t: string) => t);
  const ph = (cat: WeaveCategory) => (ing: Ingredient) =>
    ingredientPhrase(cat, ing, opts.chip ? opts.chip(ing, cat) : undefined);
  const out: string[] = [];

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
