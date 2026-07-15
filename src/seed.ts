/* =============== the seed link =============== */

/* How a pocket crosses a page boundary.

   localStorage is the obvious channel and it is the one that breaks: it throws
   in the artifact sandbox, in private mode, and on some file:// origins. So the
   seed link carries the payload in the URL itself and treats storage as an
   optimisation rather than the transport. A link works when storage does not,
   it survives a hard reload, and it can be pasted to someone else, which turns
   a workaround into the shareable-workflow feature Library wants anyway.

   Legacy links still work: library.html emits `?seed=<a single word>`, and a
   bare word is a perfectly good pocket of one. */

import {
  emptyPocket,
  type Category,
  type LitWord,
  type Pocket,
  type Tone,
  SCHEMA_VERSION,
} from "./model.js";
import { classify } from "./classify.js";
import { load as loadPocket, toLitWord } from "./pocket.js";

/* single-char codes: a 12-word pocket has to fit in a URL bar */
const CAT_CODE: Record<Category, string> = {
  Pattern: "P", Silhouette: "S", Color: "C", Symbolic: "Y", Custom: "U",
};
const CODE_CAT: Record<string, Category> = {
  P: "Pattern", S: "Silhouette", C: "Color", Y: "Symbolic", U: "Custom",
};
const TONE_CODE: Record<Tone, string> = { abs: "a", mid: "m", con: "c" };
const CODE_TONE: Record<string, Tone> = { a: "abs", m: "mid", c: "con" };

/* [ text, category, tone, from, depth, img ] */
type WireWord = [string, string, string, string, number, string?];
interface Wire {
  v: number;
  r: string;
  w: WireWord[];
}

/* Browsers are fine well past this, but a URL you cannot read over the phone
   is not a shareable link. Past the cap the words still travel via storage. */
const MAX_URL_WORDS = 24;
const MAX_IMG_LEN = 120;

/* ---- base64url over UTF-8 ---- */

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "===".slice((pad.length + 3) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* ---- encode ---- */

const PREFIX = "dd1.";

export function encode(p: Pocket): string {
  const words = p.words.filter((w) => w.kind === "word" && w.text).slice(0, MAX_URL_WORDS);
  const wire: Wire = {
    v: SCHEMA_VERSION,
    r: p.ref,
    w: words.map((w): WireWord => {
      const row: WireWord = [
        w.text,
        CAT_CODE[w.category] ?? "U",
        TONE_CODE[w.tone] ?? "m",
        w.from === "seed" ? "" : w.from,
        w.depth | 0,
      ];
      if (w.img && w.img.length <= MAX_IMG_LEN && !w.img.startsWith("data:")) row[5] = w.img;
      return row;
    }),
  };
  return PREFIX + b64urlEncode(JSON.stringify(wire));
}

/** The canvas link for a whole pocket. */
export function canvasHref(p: Pocket, page = "mvp_v6.html"): string {
  return p.words.length ? page + "?seed=" + encodeURIComponent(encode(p)) : page;
}

/** The canvas link for one word plucked out of the pocket, which is what the
    Library pocket panel does. Kept as a bare word so the link stays legible. */
export function wordHref(text: string, page = "mvp_v6.html"): string {
  return page + "?seed=" + encodeURIComponent(text);
}

/* ---- decode ---- */

function decodePayload(token: string): Pocket | null {
  try {
    const wire = JSON.parse(b64urlDecode(token.slice(PREFIX.length))) as Wire;
    if (!wire || !Array.isArray(wire.w)) return null;
    const words: LitWord[] = wire.w.map((row, i) => {
      const [text, c, t, from, depth, img] = row;
      const w: LitWord = {
        id: "u" + i,
        text: String(text ?? ""),
        kind: "word",
        from: from || "seed",
        depth: Number(depth) || 0,
        category: CODE_CAT[c] ?? "Custom",
        tone: CODE_TONE[t] ?? "mid",
        why: "carried in the link",
        litAt: i,
      };
      if (img) w.img = img;
      return w;
    });
    return {
      v: SCHEMA_VERSION,
      ref: typeof wire.r === "string" ? wire.r : "",
      refs: (wire.r || "").split(" + ").map((s) => s.trim()).filter(Boolean),
      words,
      savedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

function bareWordPocket(text: string): Pocket {
  const t = text.trim();
  if (!t) return emptyPocket();
  const w = toLitWord({ text: t, from: "seed", depth: 0 }, 0);
  return {
    v: SCHEMA_VERSION,
    ref: t,
    refs: [],
    words: [w],
    savedAt: Date.now(),
  };
}

export type SeedSource = "link" | "word" | "storage" | "none";

export interface Incoming {
  pocket: Pocket;
  source: SeedSource;
}

/** What the canvas should open with.

    The cascade is the point: a full pocket in the link wins, then a single
    word in the link, then whatever storage still holds, then nothing. Any one
    of those channels can be missing and the canvas still opens with the user's
    words in it. */
export function readIncoming(search: string = location.search): Incoming {
  let q: URLSearchParams;
  try {
    q = new URLSearchParams(search);
  } catch {
    q = new URLSearchParams("");
  }

  const raw = (q.get("seed") ?? q.get("p") ?? "").trim();

  if (raw.startsWith(PREFIX)) {
    const p = decodePayload(raw);
    if (p && p.words.length) return { pocket: p, source: "link" };
  }

  if (raw) {
    /* legacy: library.html links a single lit word */
    return { pocket: bareWordPocket(raw), source: "word" };
  }

  const stored = loadPocket();
  if (stored.words.length) return { pocket: stored, source: "storage" };

  return { pocket: emptyPocket(), source: "none" };
}

/** Read a word that arrived as a bare string, for callers that only have text. */
export function readWord(text: string) {
  return classify(text);
}
