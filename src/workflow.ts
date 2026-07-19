/* =============== workflows: the canvas, kept =============== */

/* The last leg of the three-page loop. Start hands words to the Canvas; this
   hands the finished composition to the Library — and back. Until this file,
   Library's "My design workflows" was three hard-coded demo rows: you could
   compose a formula, render it, and none of it survived a refresh.

   A Workflow is a full snapshot of the canvas: the cards and where the user
   put them (positions are the design act, so they are saved as percentages
   of the board and survive resizes), which readings they adopted, the locked
   model, their control net, and the last AI render if they made one.

   The same shape doubles as the canvas autosave (key dd_canvas), so leaving
   the page and coming back is no longer destructive. Everything goes through
   storage.ts, so the artifact-sandbox rules apply unchanged: no localStorage
   means workflows live for the session and die with it, gracefully. */

import type { Category } from "./model.js";
import { isCategory } from "./model.js";
import * as store from "./storage.js";

export const WORKFLOWS_KEY = "dd_workflows";
export const CANVAS_KEY = "dd_canvas";
/* localStorage is ~5MB and one render is ~150KB; twenty snapshots with a
   render each still fit with room for the pocket */
const MAX_WORKFLOWS = 20;

export interface WfReading {
  label: string;
  seed: number;
}

export interface WfCard {
  val: string;
  type: Category;
  source: string;
  /* percent of the board, 0-100 */
  xp: number;
  yp: number;
  readings: WfReading[];
  adopted: number[];
}

export interface WfFeature {
  val: string;
  type: Category;
  source: string;
}

/* one chip of the Reference Images panel: an uploaded ref keeps its thumb,
   a gallery ref is name-only and the canvas redraws its swatch */
export interface WfRef {
  name: string;
  img: string | null;
}

export interface Workflow {
  v: 1;
  id: string;
  title: string;
  /* where the words came from: "Betta Fish + Orchid" */
  ref: string;
  savedAt: number;
  sil: string | null;
  pose: string | null;
  locked: boolean;
  controls: string[];
  /* the fabric line of the form, user-editable; "" means the house default */
  fabric: string;
  sel: number | null;
  /* which archived workflow this canvas is, if any — the autosave carries it
     so leaving and coming back doesn't cost the canvas its identity, and a
     later save updates the archive instead of minting a twin */
  origin: string | null;
  /* last AI preview, as a (client-shrunk) data URL */
  render: string | null;
  /* the left palette, so reopening restores the tray too */
  features: WfFeature[];
  /* the Reference Images panel, so reopening keeps the refs the features
     credit as their source. Empty means "canvas default" (the demo trio). */
  refs: WfRef[];
  cards: WfCard[];
}

let seq = 0;
export function newWorkflowId(): string {
  return "wf" + Date.now().toString(36) + "-" + ++seq + Math.random().toString(36).slice(2, 6);
}

/* ---- guards: storage is user-writable, trust nothing ---- */

function asCard(v: unknown): WfCard | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Partial<WfCard>;
  if (typeof c.val !== "string" || !c.val) return null;
  return {
    val: c.val.slice(0, 80),
    type: isCategory(c.type) ? c.type : "Custom",
    source: typeof c.source === "string" ? c.source : "",
    xp: typeof c.xp === "number" ? Math.max(0, Math.min(100, c.xp)) : 50,
    yp: typeof c.yp === "number" ? Math.max(0, Math.min(100, c.yp)) : 50,
    readings: Array.isArray(c.readings)
      ? c.readings
          .filter((r): r is WfReading => !!r && typeof (r as WfReading).label === "string")
          .map((r) => ({ label: r.label.slice(0, 60), seed: typeof r.seed === "number" ? r.seed : 0 }))
      : [],
    adopted: Array.isArray(c.adopted) ? c.adopted.filter((i): i is number => typeof i === "number") : [],
  };
}

function asWorkflow(v: unknown): Workflow | null {
  if (!v || typeof v !== "object") return null;
  const w = v as Partial<Workflow>;
  if (!Array.isArray(w.cards)) return null;
  return {
    v: 1,
    id: typeof w.id === "string" && w.id ? w.id : newWorkflowId(),
    title: typeof w.title === "string" ? w.title.slice(0, 80) : "",
    ref: typeof w.ref === "string" ? w.ref : "",
    savedAt: typeof w.savedAt === "number" ? w.savedAt : 0,
    sil: typeof w.sil === "string" ? w.sil : null,
    pose: typeof w.pose === "string" ? w.pose : null,
    locked: !!w.locked,
    controls: Array.isArray(w.controls)
      ? w.controls.filter((c): c is string => typeof c === "string").slice(0, 12)
      : [],
    fabric: typeof w.fabric === "string" ? w.fabric.slice(0, 40) : "",
    sel: typeof w.sel === "number" ? w.sel : null,
    origin: typeof w.origin === "string" ? w.origin : null,
    render:
      typeof w.render === "string" && w.render.startsWith("data:image") ? w.render : null,
    features: Array.isArray(w.features)
      ? w.features
          .filter((f): f is WfFeature => !!f && typeof (f as WfFeature).val === "string")
          .map((f) => ({
            val: f.val.slice(0, 80),
            type: isCategory(f.type) ? f.type : "Custom",
            source: typeof f.source === "string" ? f.source : "",
          }))
      : [],
    refs: Array.isArray(w.refs)
      ? w.refs
          .filter((r): r is WfRef => !!r && typeof (r as WfRef).name === "string" && !!(r as WfRef).name)
          .slice(0, 8)
          .map((r) => ({
            name: r.name.slice(0, 40),
            img: typeof r.img === "string" && r.img.startsWith("data:image") ? r.img : null,
          }))
      : [],
    cards: w.cards.map(asCard).filter((c): c is WfCard => !!c),
  };
}

/* ---- the archive ---- */

export function listWorkflows(): Workflow[] {
  const raw = store.readJSON<unknown>(WORKFLOWS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.map(asWorkflow).filter((w): w is Workflow => !!w);
}

export function getWorkflow(id: string): Workflow | null {
  return listWorkflows().find((w) => w.id === id) ?? null;
}

/** Newest first. Re-saving an existing id replaces it in place. */
export function saveWorkflow(wf: Workflow): Workflow {
  const rest = listWorkflows().filter((w) => w.id !== wf.id);
  store.writeJSON(WORKFLOWS_KEY, [wf, ...rest].slice(0, MAX_WORKFLOWS));
  return wf;
}

export function removeWorkflow(id: string): void {
  store.writeJSON(WORKFLOWS_KEY, listWorkflows().filter((w) => w.id !== id));
}

/* ---- the canvas autosave ---- */

export function autosaveCanvas(wf: Workflow): void {
  store.writeJSON(CANVAS_KEY, wf);
}

export function loadCanvasAutosave(): Workflow | null {
  return asWorkflow(store.readJSON<unknown>(CANVAS_KEY));
}

export function clearCanvasAutosave(): void {
  store.remove(CANVAS_KEY);
}
