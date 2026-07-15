/* =============== window.DD =============== */

/* The pages keep their own DOM and motion code and reach the core through this
   one global. Loaded as a classic script so it works on file:// and so it is
   already defined by the time each page's inline script runs. Modules would
   defer and be too late.

   Migrating a page into TypeScript later means moving its inline script into
   src/pages/ and importing these directly. Nothing here has to change for
   that, which is the point of keeping the boundary at the data. */

import * as pocket from "./pocket.js";
import * as seed from "./seed.js";
import * as storage from "./storage.js";
import * as grow from "./grow.js";
import * as classify from "./classify.js";
import {
  CATS,
  ALL_CATEGORIES,
  emptyPocket,
  scatter,
  toCardSeed,
  SCHEMA_VERSION,
  POCKET_KEY,
} from "./model.js";

export {
  CATS,
  ALL_CATEGORIES,
  SCHEMA_VERSION,
  POCKET_KEY,
  emptyPocket,
  scatter,
  toCardSeed,
};

/* model */
export type {
  Category,
  Tone,
  LitWord,
  Pocket,
  CardSeed,
  CategoryMeta,
} from "./model.js";

/* the pocket */
export const buildPocket = pocket.buildPocket;
export const savePocket = pocket.save;
export const loadPocket = pocket.load;
export const clearPocket = pocket.clear;
export const migratePocket = pocket.migrate;
export const textWords = pocket.textWords;
export const toLitWord = pocket.toLitWord;
export type { RawLit } from "./pocket.js";

/* the seed link */
export const readIncoming = seed.readIncoming;
export const canvasHref = seed.canvasHref;
export const wordHref = seed.wordHref;
export const encodeSeed = seed.encode;
export type { Incoming, SeedSource } from "./seed.js";

/* reading a word */
export const classifyWord = classify.classify;
export const classifyOwn = classify.classifyOwn;
export const overrideCategory = classify.override;
export type { Reading } from "./classify.js";

/* growing */
export const growFor = grow.grow;
export const setGrowEngine = grow.setEngine;
export const currentGrowEngine = grow.currentEngine;
export const cannedEngine = grow.cannedEngine;
export const llmEngine = grow.llmEngine;
export const proposePrompt = grow.proposePrompt;
export const growImage = grow.growImage;
export const MOODPIX = grow.MOODPIX;
export type { Sprout, GrowEngine, GrowContext, LLMConfig, GrowImageInput } from "./grow.js";

/* storage honesty: a page can ask whether it is really persisting anything */
export const storageBackend = storage.storageBackend;
export const isPersistent = storage.isPersistent;
