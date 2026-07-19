/* =============== canonical domain model ===============
   One source of truth for everything that travels between Start, Canvas
   and Library. Before this file existed each page invented its own shape,
   which is how the pocket silently fell on the floor between start.html
   (wrote `items`) and library.html (read `words`). */

import { CAT_HEX } from "./tokens.js";

export const SCHEMA_VERSION = 2;
export const POCKET_KEY = "dd_pocket";

/* The five element categories the canvas understands.
   Fabric is intentionally NOT a category yet: material words (satin, organza,
   tactile relief) land in Pattern. Promoting it later means adding one key
   here plus one signal block in classify.ts, and nothing else. */
export type Category = "Pattern" | "Silhouette" | "Color" | "Symbolic" | "Custom";

/* Library's abstract <-> concrete axis. Orthogonal to Category, not a
   replacement for it: "liquid satin" is concrete AND Pattern, "surrender"
   is abstract AND Symbolic, but "monochrome" is mid AND Color. */
export type Tone = "abs" | "mid" | "con";

export interface CategoryMeta {
  key: Category;
  label: string;
  hex: string;
}

export const CATS: Record<Category, CategoryMeta> = {
  Pattern:    { key: "Pattern",    label: "Pattern & Texture",   hex: CAT_HEX.Pattern },
  Silhouette: { key: "Silhouette", label: "Silhouette & Shape",  hex: CAT_HEX.Silhouette },
  Color:      { key: "Color",      label: "Color Palette",       hex: CAT_HEX.Color },
  Symbolic:   { key: "Symbolic",   label: "Symbolic / Thematic", hex: CAT_HEX.Symbolic },
  Custom:     { key: "Custom",     label: "My Ideas",            hex: CAT_HEX.Custom },
};

export const ALL_CATEGORIES: Category[] = ["Pattern", "Silhouette", "Color", "Symbolic", "Custom"];

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (ALL_CATEGORIES as string[]).includes(v);
}

/* A word the user lit in the association garden.
   This is the unit of curation. AI proposed it, the user kept it, so it
   carries the lineage it grew from and the order it was picked in. Both of
   those are meaning, not metadata: they are what makes the canvas feel like
   the user's own thinking rather than a form they filled in. */
export interface LitWord {
  id: string;
  text: string;
  kind: "word" | "image";
  /* image nodes carry a src and an empty text */
  img?: string;
  /* the parent term this grew from; "seed" at the root of a lineage */
  from: string;
  depth: number;
  category: Category;
  tone: Tone;
  /* what the classifier matched on, surfaced so the user can disagree with it */
  why: string;
  /* true once the user overrode the category by hand; classifier stops touching it */
  pinned?: boolean;
  /* the order it was lit in, 0-based. Not a clock. */
  litAt: number;
}

/* What Start hands to Canvas and Library. */
export interface Pocket {
  v: number;
  /* human label for the reference(s): "Betta Fish + Orchid" */
  ref: string;
  refs: string[];
  /* one entry per ref, aligned with `refs`: a small thumb (data URL) for an
     upload, null for a gallery reference the canvas already knows. Storage
     only — the seed link drops data URLs, so this arrives via the pocket or
     not at all, and the canvas falls back to name-only chips. */
  refImgs?: (string | null)[];
  words: LitWord[];
  savedAt: number;
}

export function emptyPocket(): Pocket {
  return { v: SCHEMA_VERSION, ref: "", refs: [], words: [], savedAt: 0 };
}

export function isPocket(v: unknown): v is Pocket {
  if (!v || typeof v !== "object") return false;
  const p = v as Partial<Pocket>;
  return Array.isArray(p.words) && typeof p.ref === "string";
}

/* The shape mvp's placeNode(data, x, y) already expects. Hydrating the canvas
   from a pocket means turning each LitWord into one of these; nothing in the
   canvas renderer has to change. */
export interface CardSeed {
  val: string;
  type: Category;
  source: string;
}

export function toCardSeed(w: LitWord): CardSeed {
  return {
    val: w.text,
    type: w.category,
    /* the lineage is the provenance: a card on the board can say where it
       came from, which is the whole point of the visible genealogy */
    source: w.from && w.from !== "seed" ? w.from : "from your garden",
  };
}

/* Spread n cards over the free canvas without stacking them.
   A loose ring, not a grid: the board is a free space, and a grid would
   re-import exactly the container-classification the canvas exists to escape. */
export function scatter(
  n: number,
  bw: number,
  bh: number,
  opts: { cx?: number; cy?: number; rx?: number; ry?: number } = {}
): Array<{ x: number; y: number }> {
  const cx = opts.cx ?? bw * 0.42;
  const cy = opts.cy ?? bh * 0.5;
  const rx = opts.rx ?? Math.min(bw * 0.3, 260);
  const ry = opts.ry ?? Math.min(bh * 0.34, 210);
  const out: Array<{ x: number; y: number }> = [];
  /* golden-angle walk so consecutive words never land next to each other and
     the ring stays even at any n */
  const GOLDEN = 2.39996;
  for (let i = 0; i < n; i++) {
    const a = i * GOLDEN - Math.PI / 2;
    const t = n === 1 ? 0 : 0.45 + 0.55 * (i / Math.max(1, n - 1));
    out.push({
      x: Math.round(cx + Math.cos(a) * rx * t),
      y: Math.round(cy + Math.sin(a) * ry * t),
    });
  }
  return out;
}
