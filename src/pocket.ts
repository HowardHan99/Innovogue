/* =============== the pocket =============== */

/* What the user chose to carry out of the garden. Start writes it, Library
   reads it, Canvas hydrates from it.

   This used to be two incompatible shapes with no type between them. Start
   wrote `{ref, items:[...]}`; Library read `p.words`, found undefined, failed
   its own guard, and quietly rendered demo data instead. It looked like it
   worked. Nothing the user lit had ever reached the pocket. That is the whole
   reason this layer exists, so migration below is not politeness, it is the
   bug fix. */

import {
  POCKET_KEY,
  SCHEMA_VERSION,
  emptyPocket,
  type LitWord,
  type Pocket,
} from "./model.js";
import { classify, classifyOwn } from "./classify.js";
import * as store from "./storage.js";

/* the shape start.html used to write, kept only so old sessions survive */
interface LegacyItem {
  t: string | null;
  img: string | null;
  from: string;
  depth: number;
}
interface LegacyPocket {
  ref: string;
  items: LegacyItem[];
}

let seq = 0;
function wid(): string {
  return "w" + ++seq + "-" + Math.random().toString(36).slice(2, 7);
}

export interface RawLit {
  /* the term. Empty for an image node. */
  text?: string | null;
  img?: string | null;
  from?: string | null;
  depth?: number;
  /* set only if the user typed this word themselves */
  own?: boolean;
}

/** Turn one lit garden node into a LitWord, reading it on the way through. */
export function toLitWord(raw: RawLit, litAt: number): LitWord {
  const text = (raw.text ?? "").trim();
  const isImage = !text && !!raw.img;
  const reading = raw.own ? classifyOwn(text) : classify(text);
  const w: LitWord = {
    id: wid(),
    text,
    kind: isImage ? "image" : "word",
    from: (raw.from ?? "seed") || "seed",
    depth: raw.depth ?? 0,
    category: reading.category,
    tone: reading.tone,
    why: reading.why,
    litAt,
  };
  if (isImage && raw.img) w.img = raw.img;
  return w;
}

/* an upload thumb rides the pocket into storage; cap it so one enormous
   entry cannot eat the whole 5MB budget the workflows also live in */
const MAX_REF_IMG = 300_000;

function cleanRefImgs(refImgs: (string | null)[] | undefined, n: number): (string | null)[] | undefined {
  if (!Array.isArray(refImgs)) return undefined;
  const out = refImgs
    .slice(0, n)
    .map((s) => (typeof s === "string" && s.startsWith("data:image") && s.length <= MAX_REF_IMG ? s : null));
  while (out.length < n) out.push(null);
  return out.some(Boolean) ? out : undefined;
}

export function buildPocket(
  ref: string,
  refs: string[],
  lit: RawLit[],
  refImgs?: (string | null)[]
): Pocket {
  const p: Pocket = {
    v: SCHEMA_VERSION,
    ref: ref || refs.join(" + "),
    refs: refs.slice(),
    words: lit.map((raw, i) => toLitWord(raw, i)),
    savedAt: Date.now(),
  };
  const imgs = cleanRefImgs(refImgs, p.refs.length);
  if (imgs) p.refImgs = imgs;
  return p;
}

/* ---- migration ---- */

function isLegacy(v: unknown): v is LegacyPocket {
  return !!v && typeof v === "object" && Array.isArray((v as LegacyPocket).items);
}

/** Read anything that has ever been written under dd_pocket. */
export function migrate(v: unknown): Pocket | null {
  if (!v || typeof v !== "object") return null;

  /* current shape */
  const p = v as Partial<Pocket>;
  if (Array.isArray(p.words)) {
    const words = p.words.filter((w): w is LitWord => !!w && typeof w === "object");
    const refs = Array.isArray(p.refs) ? p.refs.filter((r): r is string => typeof r === "string") : [];
    const out: Pocket = {
      v: SCHEMA_VERSION,
      ref: typeof p.ref === "string" ? p.ref : "",
      refs,
      /* a v1 pocket has words but no reading on them: read them now */
      words: words.map((w, i) => (w.category ? w : toLitWord({ text: w.text, img: w.img, from: w.from, depth: w.depth }, i))),
      savedAt: typeof p.savedAt === "number" ? p.savedAt : Date.now(),
    };
    const imgs = cleanRefImgs(p.refImgs, refs.length);
    if (imgs) out.refImgs = imgs;
    return out;
  }

  /* the shape that never got read */
  if (isLegacy(v)) {
    const refs = (v.ref || "").split(" + ").map((s) => s.trim()).filter(Boolean);
    return {
      v: SCHEMA_VERSION,
      ref: v.ref || "",
      refs,
      words: v.items
        .filter((it) => !!it && (typeof it.t === "string" || typeof it.img === "string"))
        .map((it, i) => toLitWord({ text: it.t, img: it.img, from: it.from, depth: it.depth }, i)),
      savedAt: Date.now(),
    };
  }

  return null;
}

/* ---- read / write ---- */

export function save(p: Pocket): Pocket {
  store.writeJSON(POCKET_KEY, p);
  return p;
}

/** The pocket as it currently stands, or an empty one. Never throws. */
export function load(): Pocket {
  const raw = store.readJSON<unknown>(POCKET_KEY);
  return migrate(raw) ?? emptyPocket();
}

export function clear(): void {
  store.remove(POCKET_KEY);
}

export function isEmpty(p: Pocket): boolean {
  return !p.words.length;
}

/** Words only, images dropped. Library renders text chips and an image node
    has no text, which is why the old pocket would have rendered empty chips. */
export function textWords(p: Pocket): LitWord[] {
  return p.words.filter((w) => w.kind === "word" && !!w.text);
}
