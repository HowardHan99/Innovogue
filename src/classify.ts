/* =============== the backstage translation layer =============== */

/* The canvas dropped container-classification from the UI: the user arranges
   words in free space and the system works out what kind of element each one
   is. This file is that "system". It is the single place where a word becomes
   an element, so it is also the single place to blame when the reading is
   wrong.

   Two rules follow from "AI proposes, user curates":

   1. Every reading is explainable. classify() returns `why` (the signal it
      matched), never a bare label. A user who sees "read as Colour, matched
      'ombre'" can argue with it. A user who sees only "Colour" can only obey.

   2. Every reading is overridable. A pinned word is never re-read. The
      classifier is a proposal, and pinning is the curation.

   It is deliberately a lexicon, not a model: it runs offline, it is
   deterministic, and you can fix a bad reading by editing one line. When
   growFor() becomes a real LLM call it will emit unseen vocabulary, which is
   why this matches on morphemes and substrings rather than exact terms. */

import type { Category, Tone } from "./model.js";
import { isCategory } from "./model.js";

export interface Reading {
  category: Category;
  tone: Tone;
  /* the signal that decided it, for the UI to show */
  why: string;
  /* 0..1. Low means we guessed; the UI can invite the user to correct it. */
  confidence: number;
}

/* Matching is substring on a lowercased term, which is what lets "blush ombre"
   and "soft ombre wash" both land on Colour without either being listed.
   Weight is how diagnostic the signal is, not how common. */
type Signal = [pattern: string, weight: number];

const SIGNALS: Record<Category, Signal[]> = {
  /* surface, material and construction detail. Fabric words live here until
     Fabric earns its own category. */
  Pattern: [
    ["iridescen", 3], ["prismatic", 3], ["oil-slick", 3], ["beetle-wing", 3],
    ["shimmer", 3], ["sheen", 3], ["gloss", 3], ["matte", 3],
    ["organza", 3], ["gossamer", 3], ["chiffon", 3], ["satin", 3], ["silk", 3],
    ["tulle", 3], ["velvet", 3], ["lace", 3], ["denim", 3], ["leather", 3],
    ["veil", 3], ["mesh", 3], ["knit", 3], ["woven", 3], ["weave", 3],
    ["pleat", 3], ["fold", 3], ["ruche", 3], ["gather", 3], ["quilt", 3],
    ["seam", 3], ["stitch", 3], ["topstitch", 3], ["panel", 3], ["dart", 3],
    ["fringe", 3], ["thread", 3], ["tassel", 3], ["frayed", 3], ["raw edge", 3],
    ["texture", 3], ["tactile", 3], ["relief", 3], ["ridged", 3], ["grain", 3],
    ["crack", 3], ["crease", 3], ["wrinkle", 3], ["scale", 3], ["feather", 3],
    ["translucen", 2], ["transparen", 2], ["sheer", 2], ["opaque", 2],
    ["print", 2], ["motif", 2], ["pattern", 2], ["repeat", 2], ["stripe", 2],
    ["dot", 2], ["check", 2], ["embroider", 2], ["bead", 2], ["sequin", 2],
    ["surface", 2], ["skin", 2], ["mirrored", 2], ["radial", 2],
  ],

  /* shape, line, cut and the space a garment occupies */
  Silhouette: [
    ["silhouette", 3], ["a-line", 3], ["x-line", 3], ["column", 3],
    ["mermaid", 3], ["ballgown", 3], ["bodice", 3], ["hem", 3], ["waist", 3],
    ["shoulder", 3], ["sleeve", 3], ["collar", 3], ["neckline", 3], ["hip", 3],
    ["drape", 3], ["cut", 3], ["bias", 3], ["wrap", 3], ["curve", 3],
    ["line", 3], ["contour", 3], ["volume", 3], ["proportion", 3],
    ["structur", 3], ["sculptur", 3], ["architectur", 3], ["shell", 3],
    ["asymmetr", 3], ["symmetr", 3], ["exaggerat", 3], ["oversiz", 3],
    ["negative space", 3], ["scallop", 3], ["flare", 3], ["taper", 3],
    ["spiral", 2], ["furl", 2], ["unfurl", 2], ["form", 2], ["shape", 2],
    ["edge", 2], ["silhouett", 2],
  ],

  /* hue, value, light */
  Color: [
    ["ombre", 3], ["gradient", 3], ["monochrome", 3], ["tonal", 3],
    ["undertone", 3], ["palette", 3], ["hue", 3], ["tint", 3], ["shade", 3],
    ["wash", 3], ["dye", 3], ["bleach", 3], ["faded", 3],
    ["ivory", 3], ["bone white", 3], ["cream", 3], ["blush", 3], ["ecru", 3],
    ["white", 3], ["black", 3], ["ink", 3], ["char", 3],
    ["red", 3], ["pink", 3], ["rose", 3], ["blue", 3], ["teal", 3],
    ["green", 3], ["sage", 3], ["olive", 3], ["gold", 3], ["silver", 3],
    ["copper", 3], ["rust", 3], ["ochre", 3], ["indigo", 3], ["violet", 3],
    ["amber", 3], ["earthy", 3], ["pale", 3], ["saturat", 3], ["desaturat", 3],
    ["glow", 2], ["backlit", 2], ["half-light", 2], ["light", 1], ["dark", 1],
  ],

  /* what the garment is about. Feeling, story, stance. */
  Symbolic: [
    ["transformation", 3], ["rebirth", 3], ["metamorph", 3], ["memory", 3],
    ["surrender", 3], ["defiance", 3], ["longing", 3], ["nostalgia", 3],
    ["grief", 3], ["joy", 3], ["tender", 3], ["fragil", 3], ["delicate", 3],
    ["graceful", 3], ["grace", 3], ["quiet", 3], ["silence", 3], ["stillness", 3],
    ["weightless", 3], ["suspend", 3], ["float", 3], ["drift", 3],
    ["slow motion", 3], ["atmosphere", 3], ["mood", 3], ["half-light", 2],
    ["gesture", 3], ["balance", 3], ["ritual", 3], ["armor", 3], ["armour", 3],
    ["romantic", 3], ["solemn", 3], ["playful", 3], ["stark", 3],
    ["minimal", 2], ["bloom", 2], ["opening", 2], ["ethereal", 3], ["dream", 3],
  ],

  /* never matched by signal. Reserved for words the user typed themselves,
     which are theirs by definition and do not get told what they are. */
  Custom: [],
};

/* Tone is the abstract <-> concrete axis Library colours its pocket dots by.
   It is not a restatement of category: "monochrome" is Colour and mid,
   "liquid satin" is Pattern and concrete, "surrender" is Symbolic and
   abstract. So it gets its own signals. */
const ABSTRACT: string[] = [
  "transformation", "rebirth", "metamorph", "memory", "surrender", "defiance",
  "longing", "nostalgia", "grief", "joy", "tender", "fragil", "delicate",
  "graceful", "grace", "quiet", "silence", "stillness", "weightless",
  "suspend", "drift", "slow motion", "atmosphere", "mood", "gesture",
  "balance", "ritual", "romantic", "solemn", "playful", "stark", "minimal",
  "ethereal", "dream", "negative space",
];

const CONCRETE: string[] = [
  "hem", "seam", "stitch", "panel", "pleat", "fold", "veil", "thread",
  "fringe", "tassel", "dart", "collar", "sleeve", "bodice", "waist",
  "shoulder", "organza", "satin", "silk", "chiffon", "tulle", "velvet",
  "lace", "denim", "leather", "bead", "sequin", "embroider", "scallop",
  "crack", "ridged", "grain", "weave", "woven", "knit", "mesh", "wing",
  "petal", "edge", "cut", "bias", "wrap", "shell", "column",
];

function hit(term: string, list: string[]): string | null {
  for (const p of list) if (term.includes(p)) return p;
  return null;
}

function toneFor(term: string, category: Category): Tone {
  const a = hit(term, ABSTRACT);
  const c = hit(term, CONCRETE);
  if (a && !c) return "abs";
  if (c && !a) return "con";
  if (a && c) return a.length >= c.length ? "abs" : "con";
  /* nothing matched: lean on the category, which is a weaker but honest guess */
  if (category === "Symbolic") return "abs";
  if (category === "Pattern" || category === "Silhouette") return "con";
  return "mid";
}

/* English compounds put the head noun last: "floating hem" is a hem, "liquid
   satin" is a satin, "blush ombre" is an ombre. Scoring the whole string alone
   reads "floating hem" as Symbolic because `float` is a longer match than
   `hem`, which is exactly backwards. So a signal that lands on the head token
   is worth more than one that lands on a modifier. */
const HEAD_BONUS = 80;
const EXACT_BONUS = 200;

function scoreSignal(term: string, head: string, pattern: string, weight: number): number {
  if (!term.includes(pattern)) return -1;
  let s = weight * 100 + pattern.length;
  if (term === pattern) s += EXACT_BONUS;
  else if (head.includes(pattern)) s += HEAD_BONUS;
  return s;
}

/** Read a word as an element. A proposal, not a verdict. */
export function classify(raw: string): Reading {
  const term = (raw || "").toLowerCase().trim();
  if (!term) {
    return { category: "Custom", tone: "mid", why: "empty", confidence: 0 };
  }

  const tokens = term.split(/\s+/);
  const head = tokens[tokens.length - 1] ?? term;

  let best: { cat: Category; score: number; weight: number; why: string } | null = null;

  for (const cat of Object.keys(SIGNALS) as Category[]) {
    for (const [pattern, weight] of SIGNALS[cat]) {
      const score = scoreSignal(term, head, pattern, weight);
      if (score < 0) continue;
      if (!best || score > best.score) best = { cat, score, weight, why: pattern };
    }
  }

  if (!best) {
    /* We genuinely do not know. Say so rather than forcing it into a bucket:
       Symbolic is the honest home for a word we cannot read as material, and
       low confidence tells the UI to invite a correction instead of asserting. */
    return { category: "Symbolic", tone: toneFor(term, "Symbolic"), why: "unread", confidence: 0.2 };
  }

  return {
    category: best.cat,
    tone: toneFor(term, best.cat),
    why: best.why,
    confidence: best.weight >= 3 ? 0.9 : best.weight >= 2 ? 0.65 : 0.4,
  };
}

/** A word the user typed is theirs. We do not classify it, we file it as Custom. */
export function classifyOwn(raw: string): Reading {
  const term = (raw || "").toLowerCase().trim();
  return { category: "Custom", tone: toneFor(term, "Custom"), why: "yours", confidence: 1 };
}

/** The curation act: the user overrules the reading, and it sticks. */
export function override(cat: unknown): Category {
  return isCategory(cat) ? cat : "Custom";
}
