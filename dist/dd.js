"use strict";
var DD = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    ALL_CATEGORIES: () => ALL_CATEGORIES,
    CATS: () => CATS,
    MOODPIX: () => MOODPIX2,
    POCKET_KEY: () => POCKET_KEY,
    SCHEMA_VERSION: () => SCHEMA_VERSION,
    asFormula: () => asFormula2,
    autosaveCanvas: () => autosaveCanvas2,
    buildPocket: () => buildPocket2,
    cannedEngine: () => cannedEngine2,
    canvasHref: () => canvasHref2,
    classifyOwn: () => classifyOwn2,
    classifyWord: () => classifyWord,
    clearCanvasAutosave: () => clearCanvasAutosave2,
    clearPocket: () => clearPocket,
    currentGrowEngine: () => currentGrowEngine,
    describeImage: () => describeImage2,
    describePrompt: () => describePrompt2,
    emptyPocket: () => emptyPocket,
    encodeSeed: () => encodeSeed,
    getWorkflow: () => getWorkflow2,
    growFor: () => growFor,
    growImage: () => growImage2,
    ingredientPhrase: () => ingredientPhrase2,
    isPersistent: () => isPersistent2,
    listWorkflows: () => listWorkflows2,
    llmEngine: () => llmEngine2,
    loadCanvasAutosave: () => loadCanvasAutosave2,
    loadPocket: () => loadPocket,
    migratePocket: () => migratePocket,
    newWorkflowId: () => newWorkflowId2,
    overrideCategory: () => overrideCategory,
    prepRefImage: () => prepRefImage2,
    proposePrompt: () => proposePrompt2,
    readIncoming: () => readIncoming2,
    readingPhrase: () => readingPhrase2,
    removeWorkflow: () => removeWorkflow2,
    savePocket: () => savePocket,
    saveWorkflow: () => saveWorkflow2,
    scatter: () => scatter,
    setGrowEngine: () => setGrowEngine,
    storageBackend: () => storageBackend2,
    textWords: () => textWords2,
    toCardSeed: () => toCardSeed,
    toLitWord: () => toLitWord2,
    weaveSentences: () => weaveSentences2,
    wordHref: () => wordHref2
  });

  // src/tokens.ts
  var CAT_HEX = {
    Pattern: "#FF8FC2",
    Silhouette: "#EDE4A2",
    Color: "#A9C77F",
    Symbolic: "#7FB4E6",
    Custom: "#8b877c"
  };

  // src/model.ts
  var SCHEMA_VERSION = 2;
  var POCKET_KEY = "dd_pocket";
  var CATS = {
    Pattern: { key: "Pattern", label: "Pattern & Texture", hex: CAT_HEX.Pattern },
    Silhouette: { key: "Silhouette", label: "Silhouette & Shape", hex: CAT_HEX.Silhouette },
    Color: { key: "Color", label: "Color Palette", hex: CAT_HEX.Color },
    Symbolic: { key: "Symbolic", label: "Symbolic / Thematic", hex: CAT_HEX.Symbolic },
    Custom: { key: "Custom", label: "My Ideas", hex: CAT_HEX.Custom }
  };
  var ALL_CATEGORIES = ["Pattern", "Silhouette", "Color", "Symbolic", "Custom"];
  function isCategory(v) {
    return typeof v === "string" && ALL_CATEGORIES.includes(v);
  }
  function emptyPocket() {
    return { v: SCHEMA_VERSION, ref: "", refs: [], words: [], savedAt: 0 };
  }
  function toCardSeed(w) {
    return {
      val: w.text,
      type: w.category,
      /* the lineage is the provenance: a card on the board can say where it
         came from, which is the whole point of the visible genealogy */
      source: w.from && w.from !== "seed" ? w.from : "from your garden"
    };
  }
  function scatter(n, bw, bh, opts = {}) {
    var _a, _b, _c, _d;
    const cx = (_a = opts.cx) != null ? _a : bw * 0.42;
    const cy = (_b = opts.cy) != null ? _b : bh * 0.5;
    const rx = (_c = opts.rx) != null ? _c : Math.min(bw * 0.3, 260);
    const ry = (_d = opts.ry) != null ? _d : Math.min(bh * 0.34, 210);
    const out = [];
    const GOLDEN = 2.39996;
    for (let i = 0; i < n; i++) {
      const a = i * GOLDEN - Math.PI / 2;
      const t = n === 1 ? 0 : 0.45 + 0.55 * (i / Math.max(1, n - 1));
      out.push({
        x: Math.round(cx + Math.cos(a) * rx * t),
        y: Math.round(cy + Math.sin(a) * ry * t)
      });
    }
    return out;
  }

  // src/classify.ts
  var SIGNALS = {
    /* surface, material and construction detail. Fabric words live here until
       Fabric earns its own category. */
    Pattern: [
      ["iridescen", 3],
      ["prismatic", 3],
      ["oil-slick", 3],
      ["beetle-wing", 3],
      ["shimmer", 3],
      ["sheen", 3],
      ["gloss", 3],
      ["matte", 3],
      ["organza", 3],
      ["gossamer", 3],
      ["chiffon", 3],
      ["satin", 3],
      ["silk", 3],
      ["tulle", 3],
      ["velvet", 3],
      ["lace", 3],
      ["denim", 3],
      ["leather", 3],
      ["veil", 3],
      ["mesh", 3],
      ["knit", 3],
      ["woven", 3],
      ["weave", 3],
      ["pleat", 3],
      ["fold", 3],
      ["ruche", 3],
      ["gather", 3],
      ["quilt", 3],
      ["seam", 3],
      ["stitch", 3],
      ["topstitch", 3],
      ["panel", 3],
      ["dart", 3],
      ["fringe", 3],
      ["thread", 3],
      ["tassel", 3],
      ["frayed", 3],
      ["raw edge", 3],
      ["texture", 3],
      ["tactile", 3],
      ["relief", 3],
      ["ridged", 3],
      ["grain", 3],
      ["crack", 3],
      ["crease", 3],
      ["wrinkle", 3],
      ["scale", 3],
      ["feather", 3],
      ["translucen", 2],
      ["transparen", 2],
      ["sheer", 2],
      ["opaque", 2],
      ["print", 2],
      ["motif", 2],
      ["pattern", 2],
      ["repeat", 2],
      ["stripe", 2],
      ["dot", 2],
      ["check", 2],
      ["embroider", 2],
      ["bead", 2],
      ["sequin", 2],
      ["surface", 2],
      ["skin", 2],
      ["mirrored", 2],
      ["radial", 2]
    ],
    /* shape, line, cut and the space a garment occupies */
    Silhouette: [
      ["silhouette", 3],
      ["a-line", 3],
      ["x-line", 3],
      ["column", 3],
      ["mermaid", 3],
      ["ballgown", 3],
      ["bodice", 3],
      ["hem", 3],
      ["waist", 3],
      ["shoulder", 3],
      ["sleeve", 3],
      ["collar", 3],
      ["neckline", 3],
      ["hip", 3],
      ["drape", 3],
      ["cut", 3],
      ["bias", 3],
      ["wrap", 3],
      ["curve", 3],
      ["line", 3],
      ["contour", 3],
      ["volume", 3],
      ["proportion", 3],
      ["structur", 3],
      ["sculptur", 3],
      ["architectur", 3],
      ["shell", 3],
      ["asymmetr", 3],
      ["symmetr", 3],
      ["exaggerat", 3],
      ["oversiz", 3],
      ["negative space", 3],
      ["scallop", 3],
      ["flare", 3],
      ["taper", 3],
      ["spiral", 2],
      ["furl", 2],
      ["unfurl", 2],
      ["form", 2],
      ["shape", 2],
      ["edge", 2],
      ["silhouett", 2]
    ],
    /* hue, value, light */
    Color: [
      ["ombre", 3],
      ["gradient", 3],
      ["monochrome", 3],
      ["tonal", 3],
      ["undertone", 3],
      ["palette", 3],
      ["hue", 3],
      ["tint", 3],
      ["shade", 3],
      ["wash", 3],
      ["dye", 3],
      ["bleach", 3],
      ["faded", 3],
      ["ivory", 3],
      ["bone white", 3],
      ["cream", 3],
      ["blush", 3],
      ["ecru", 3],
      ["white", 3],
      ["black", 3],
      ["ink", 3],
      ["char", 3],
      ["red", 3],
      ["pink", 3],
      ["rose", 3],
      ["blue", 3],
      ["teal", 3],
      ["green", 3],
      ["sage", 3],
      ["olive", 3],
      ["gold", 3],
      ["silver", 3],
      ["copper", 3],
      ["rust", 3],
      ["ochre", 3],
      ["indigo", 3],
      ["violet", 3],
      ["amber", 3],
      ["earthy", 3],
      ["pale", 3],
      ["saturat", 3],
      ["desaturat", 3],
      ["glow", 2],
      ["backlit", 2],
      ["half-light", 2],
      ["light", 1],
      ["dark", 1]
    ],
    /* what the garment is about. Feeling, story, stance. */
    Symbolic: [
      ["transformation", 3],
      ["rebirth", 3],
      ["metamorph", 3],
      ["memory", 3],
      ["surrender", 3],
      ["defiance", 3],
      ["longing", 3],
      ["nostalgia", 3],
      ["grief", 3],
      ["joy", 3],
      ["tender", 3],
      ["fragil", 3],
      ["delicate", 3],
      ["graceful", 3],
      ["grace", 3],
      ["quiet", 3],
      ["silence", 3],
      ["stillness", 3],
      ["weightless", 3],
      ["suspend", 3],
      ["float", 3],
      ["drift", 3],
      ["slow motion", 3],
      ["atmosphere", 3],
      ["mood", 3],
      ["half-light", 2],
      ["gesture", 3],
      ["balance", 3],
      ["ritual", 3],
      ["armor", 3],
      ["armour", 3],
      ["romantic", 3],
      ["solemn", 3],
      ["playful", 3],
      ["stark", 3],
      ["minimal", 2],
      ["bloom", 2],
      ["opening", 2],
      ["ethereal", 3],
      ["dream", 3]
    ],
    /* never matched by signal. Reserved for words the user typed themselves,
       which are theirs by definition and do not get told what they are. */
    Custom: []
  };
  var ABSTRACT = [
    "transformation",
    "rebirth",
    "metamorph",
    "memory",
    "surrender",
    "defiance",
    "longing",
    "nostalgia",
    "grief",
    "joy",
    "tender",
    "fragil",
    "delicate",
    "graceful",
    "grace",
    "quiet",
    "silence",
    "stillness",
    "weightless",
    "suspend",
    "drift",
    "slow motion",
    "atmosphere",
    "mood",
    "gesture",
    "balance",
    "ritual",
    "romantic",
    "solemn",
    "playful",
    "stark",
    "minimal",
    "ethereal",
    "dream",
    "negative space"
  ];
  var CONCRETE = [
    "hem",
    "seam",
    "stitch",
    "panel",
    "pleat",
    "fold",
    "veil",
    "thread",
    "fringe",
    "tassel",
    "dart",
    "collar",
    "sleeve",
    "bodice",
    "waist",
    "shoulder",
    "organza",
    "satin",
    "silk",
    "chiffon",
    "tulle",
    "velvet",
    "lace",
    "denim",
    "leather",
    "bead",
    "sequin",
    "embroider",
    "scallop",
    "crack",
    "ridged",
    "grain",
    "weave",
    "woven",
    "knit",
    "mesh",
    "wing",
    "petal",
    "edge",
    "cut",
    "bias",
    "wrap",
    "shell",
    "column"
  ];
  function hit(term, list) {
    for (const p of list) if (term.includes(p)) return p;
    return null;
  }
  function toneFor(term, category) {
    const a = hit(term, ABSTRACT);
    const c = hit(term, CONCRETE);
    if (a && !c) return "abs";
    if (c && !a) return "con";
    if (a && c) return a.length >= c.length ? "abs" : "con";
    if (category === "Symbolic") return "abs";
    if (category === "Pattern" || category === "Silhouette") return "con";
    return "mid";
  }
  var HEAD_BONUS = 80;
  var EXACT_BONUS = 200;
  function scoreSignal(term, head, pattern, weight) {
    if (!term.includes(pattern)) return -1;
    let s = weight * 100 + pattern.length;
    if (term === pattern) s += EXACT_BONUS;
    else if (head.includes(pattern)) s += HEAD_BONUS;
    return s;
  }
  function classify(raw) {
    var _a;
    const term = (raw || "").toLowerCase().trim();
    if (!term) {
      return { category: "Custom", tone: "mid", why: "empty", confidence: 0 };
    }
    const tokens = term.split(/\s+/);
    const head = (_a = tokens[tokens.length - 1]) != null ? _a : term;
    let best = null;
    for (const cat of Object.keys(SIGNALS)) {
      for (const [pattern, weight] of SIGNALS[cat]) {
        const score = scoreSignal(term, head, pattern, weight);
        if (score < 0) continue;
        if (!best || score > best.score) best = { cat, score, weight, why: pattern };
      }
    }
    if (!best) {
      return { category: "Symbolic", tone: toneFor(term, "Symbolic"), why: "unread", confidence: 0.2 };
    }
    return {
      category: best.cat,
      tone: toneFor(term, best.cat),
      why: best.why,
      confidence: best.weight >= 3 ? 0.9 : best.weight >= 2 ? 0.65 : 0.4
    };
  }
  function classifyOwn(raw) {
    const term = (raw || "").toLowerCase().trim();
    return { category: "Custom", tone: toneFor(term, "Custom"), why: "yours", confidence: 1 };
  }
  function override(cat) {
    return isCategory(cat) ? cat : "Custom";
  }

  // src/storage.ts
  var backend = "memory";
  var mem = /* @__PURE__ */ new Map();
  var probed = false;
  function probe() {
    if (probed) return;
    probed = true;
    try {
      const k = "__dd_probe__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      backend = "local";
    } catch {
      backend = "memory";
    }
  }
  function storageBackend() {
    probe();
    return backend;
  }
  function isPersistent() {
    return storageBackend() === "local";
  }
  function get(key) {
    var _a, _b;
    probe();
    try {
      return backend === "local" ? window.localStorage.getItem(key) : (_a = mem.get(key)) != null ? _a : null;
    } catch {
      return (_b = mem.get(key)) != null ? _b : null;
    }
  }
  function set(key, value) {
    probe();
    mem.set(key, value);
    if (backend !== "local") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      backend = "memory";
    }
  }
  function remove(key) {
    probe();
    mem.delete(key);
    if (backend !== "local") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
    }
  }
  function readJSON(key) {
    const raw = get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  function writeJSON(key, value) {
    try {
      set(key, JSON.stringify(value));
    } catch {
    }
  }

  // src/pocket.ts
  var seq = 0;
  function wid() {
    return "w" + ++seq + "-" + Math.random().toString(36).slice(2, 7);
  }
  function toLitWord(raw, litAt) {
    var _a, _b, _c;
    const text = ((_a = raw.text) != null ? _a : "").trim();
    const isImage = !text && !!raw.img;
    const reading = raw.own ? classifyOwn(text) : classify(text);
    const w = {
      id: wid(),
      text,
      kind: isImage ? "image" : "word",
      from: ((_b = raw.from) != null ? _b : "seed") || "seed",
      depth: (_c = raw.depth) != null ? _c : 0,
      category: reading.category,
      tone: reading.tone,
      why: reading.why,
      litAt
    };
    if (isImage && raw.img) w.img = raw.img;
    return w;
  }
  var MAX_REF_IMG = 3e5;
  function cleanRefImgs(refImgs, n) {
    if (!Array.isArray(refImgs)) return void 0;
    const out = refImgs.slice(0, n).map((s) => typeof s === "string" && s.startsWith("data:image") && s.length <= MAX_REF_IMG ? s : null);
    while (out.length < n) out.push(null);
    return out.some(Boolean) ? out : void 0;
  }
  function buildPocket(ref, refs, lit, refImgs) {
    const p = {
      v: SCHEMA_VERSION,
      ref: ref || refs.join(" + "),
      refs: refs.slice(),
      words: lit.map((raw, i) => toLitWord(raw, i)),
      savedAt: Date.now()
    };
    const imgs = cleanRefImgs(refImgs, p.refs.length);
    if (imgs) p.refImgs = imgs;
    return p;
  }
  function isLegacy(v) {
    return !!v && typeof v === "object" && Array.isArray(v.items);
  }
  function migrate(v) {
    if (!v || typeof v !== "object") return null;
    const p = v;
    if (Array.isArray(p.words)) {
      const words = p.words.filter((w) => !!w && typeof w === "object");
      const refs = Array.isArray(p.refs) ? p.refs.filter((r) => typeof r === "string") : [];
      const out = {
        v: SCHEMA_VERSION,
        ref: typeof p.ref === "string" ? p.ref : "",
        refs,
        /* a v1 pocket has words but no reading on them: read them now */
        words: words.map((w, i) => w.category ? w : toLitWord({ text: w.text, img: w.img, from: w.from, depth: w.depth }, i)),
        savedAt: typeof p.savedAt === "number" ? p.savedAt : Date.now()
      };
      const imgs = cleanRefImgs(p.refImgs, refs.length);
      if (imgs) out.refImgs = imgs;
      return out;
    }
    if (isLegacy(v)) {
      const refs = (v.ref || "").split(" + ").map((s) => s.trim()).filter(Boolean);
      return {
        v: SCHEMA_VERSION,
        ref: v.ref || "",
        refs,
        words: v.items.filter((it) => !!it && (typeof it.t === "string" || typeof it.img === "string")).map((it, i) => toLitWord({ text: it.t, img: it.img, from: it.from, depth: it.depth }, i)),
        savedAt: Date.now()
      };
    }
    return null;
  }
  function save(p) {
    writeJSON(POCKET_KEY, p);
    return p;
  }
  function load() {
    var _a;
    const raw = readJSON(POCKET_KEY);
    return (_a = migrate(raw)) != null ? _a : emptyPocket();
  }
  function clear() {
    remove(POCKET_KEY);
  }
  function textWords(p) {
    return p.words.filter((w) => w.kind === "word" && !!w.text);
  }

  // src/seed.ts
  var CAT_CODE = {
    Pattern: "P",
    Silhouette: "S",
    Color: "C",
    Symbolic: "Y",
    Custom: "U"
  };
  var CODE_CAT = {
    P: "Pattern",
    S: "Silhouette",
    C: "Color",
    Y: "Symbolic",
    U: "Custom"
  };
  var TONE_CODE = { abs: "a", mid: "m", con: "c" };
  var CODE_TONE = { a: "abs", m: "mid", c: "con" };
  var MAX_URL_WORDS = 24;
  var MAX_IMG_LEN = 120;
  function b64urlEncode(s) {
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(s) {
    const pad = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(pad + "===".slice((pad.length + 3) % 4));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  var PREFIX = "dd1.";
  function encode(p) {
    const words = p.words.filter((w) => w.kind === "word" && w.text).slice(0, MAX_URL_WORDS);
    const wire = {
      v: SCHEMA_VERSION,
      r: p.ref,
      w: words.map((w) => {
        var _a, _b;
        const row = [
          w.text,
          (_a = CAT_CODE[w.category]) != null ? _a : "U",
          (_b = TONE_CODE[w.tone]) != null ? _b : "m",
          w.from === "seed" ? "" : w.from,
          w.depth | 0
        ];
        if (w.img && w.img.length <= MAX_IMG_LEN && !w.img.startsWith("data:")) row[5] = w.img;
        return row;
      })
    };
    return PREFIX + b64urlEncode(JSON.stringify(wire));
  }
  function canvasHref(p, page = "mvp_v6.html") {
    return p.words.length ? page + "?seed=" + encodeURIComponent(encode(p)) : page;
  }
  function wordHref(text, page = "mvp_v6.html") {
    return page + "?seed=" + encodeURIComponent(text);
  }
  function decodePayload(token) {
    try {
      const wire = JSON.parse(b64urlDecode(token.slice(PREFIX.length)));
      if (!wire || !Array.isArray(wire.w)) return null;
      const words = wire.w.map((row, i) => {
        var _a, _b;
        const [text, c, t, from, depth, img] = row;
        const w = {
          id: "u" + i,
          text: String(text != null ? text : ""),
          kind: "word",
          from: from || "seed",
          depth: Number(depth) || 0,
          category: (_a = CODE_CAT[c]) != null ? _a : "Custom",
          tone: (_b = CODE_TONE[t]) != null ? _b : "mid",
          why: "carried in the link",
          litAt: i
        };
        if (img) w.img = img;
        return w;
      });
      return {
        v: SCHEMA_VERSION,
        ref: typeof wire.r === "string" ? wire.r : "",
        refs: (wire.r || "").split(" + ").map((s) => s.trim()).filter(Boolean),
        words,
        savedAt: Date.now()
      };
    } catch {
      return null;
    }
  }
  function bareWordPocket(text) {
    const t = text.trim();
    if (!t) return emptyPocket();
    const w = toLitWord({ text: t, from: "seed", depth: 0 }, 0);
    return {
      v: SCHEMA_VERSION,
      ref: t,
      refs: [],
      words: [w],
      savedAt: Date.now()
    };
  }
  function readIncoming(search = location.search) {
    var _a, _b;
    let q;
    try {
      q = new URLSearchParams(search);
    } catch {
      q = new URLSearchParams("");
    }
    const raw = ((_b = (_a = q.get("seed")) != null ? _a : q.get("p")) != null ? _b : "").trim();
    if (raw.startsWith(PREFIX)) {
      const p = decodePayload(raw);
      if (p && p.words.length) return { pocket: p, source: "link" };
    }
    if (raw) {
      return { pocket: bareWordPocket(raw), source: "word" };
    }
    const stored = load();
    if (stored.words.length) return { pocket: stored, source: "storage" };
    return { pocket: emptyPocket(), source: "none" };
  }

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
        var _a;
        const avoid = new Set(((_a = ctx == null ? void 0 : ctx.avoid) != null ? _a : []).map((t) => t.toLowerCase()));
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
    var _a, _b;
    const lineage = ((_a = ctx.lineage) != null ? _a : []).join(" -> ");
    const avoid = ((_b = ctx.avoid) != null ? _b : []).slice(0, 40).join(", ");
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
        var _a, _b, _c;
        const n = (_a = cfg.n) != null ? _a : 3;
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), (_b = cfg.timeoutMs) != null ? _b : 6e3);
        try {
          const res = await fetch(cfg.endpoint, {
            method: "POST",
            headers: { "content-type": "application/json", ...(_c = cfg.headers) != null ? _c : {} },
            body: JSON.stringify({
              model: cfg.model,
              term,
              context: ctx != null ? ctx : {},
              prompt: proposePrompt(term, ctx != null ? ctx : {}, n)
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
    var _a;
    try {
      if (typeof document === "undefined") return dataUrl;
      return (_a = scaleToJpeg(await decodeImg(dataUrl), maxPx)) != null ? _a : dataUrl;
    } catch {
      return dataUrl;
    }
  }
  async function prepRefImage(dataUrl) {
    var _a, _b;
    try {
      if (typeof document === "undefined") return null;
      const img = await decodeImg(dataUrl);
      if (!img.width || !img.height) return null;
      return {
        src: (_a = scaleToJpeg(img, 768)) != null ? _a : dataUrl,
        thumb: (_b = scaleToJpeg(img, 280)) != null ? _b : dataUrl
      };
    } catch {
      return null;
    }
  }
  async function describeImage(image, cfg = {}) {
    var _a, _b;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), (_a = cfg.timeoutMs) != null ? _a : 15e3);
    try {
      const res = await fetch((_b = cfg.endpoint) != null ? _b : "/api/grow", {
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
    var _a, _b, _c;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), (_a = cfg.timeoutMs) != null ? _a : 3e4);
    try {
      const res = await fetch((_b = cfg.endpoint) != null ? _b : "/api/image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        signal: ctl.signal
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (typeof data.image !== "string" || !data.image.startsWith("data:image")) return null;
      return await shrinkDataUrl(data.image, (_c = cfg.maxPx) != null ? _c : 768);
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

  // src/workflow.ts
  var WORKFLOWS_KEY = "dd_workflows";
  var CANVAS_KEY = "dd_canvas";
  var MAX_WORKFLOWS = 20;
  var seq2 = 0;
  function newWorkflowId() {
    return "wf" + Date.now().toString(36) + "-" + ++seq2 + Math.random().toString(36).slice(2, 6);
  }
  function asCard(v) {
    if (!v || typeof v !== "object") return null;
    const c = v;
    if (typeof c.val !== "string" || !c.val) return null;
    return {
      val: c.val.slice(0, 80),
      type: isCategory(c.type) ? c.type : "Custom",
      source: typeof c.source === "string" ? c.source : "",
      xp: typeof c.xp === "number" ? Math.max(0, Math.min(100, c.xp)) : 50,
      yp: typeof c.yp === "number" ? Math.max(0, Math.min(100, c.yp)) : 50,
      readings: Array.isArray(c.readings) ? c.readings.filter((r) => !!r && typeof r.label === "string").map((r) => ({ label: r.label.slice(0, 60), seed: typeof r.seed === "number" ? r.seed : 0 })) : [],
      adopted: Array.isArray(c.adopted) ? c.adopted.filter((i) => typeof i === "number") : []
    };
  }
  function asWorkflow(v) {
    if (!v || typeof v !== "object") return null;
    const w = v;
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
      controls: Array.isArray(w.controls) ? w.controls.filter((c) => typeof c === "string").slice(0, 12) : [],
      fabric: typeof w.fabric === "string" ? w.fabric.slice(0, 40) : "",
      sel: typeof w.sel === "number" ? w.sel : null,
      origin: typeof w.origin === "string" ? w.origin : null,
      render: typeof w.render === "string" && w.render.startsWith("data:image") ? w.render : null,
      features: Array.isArray(w.features) ? w.features.filter((f) => !!f && typeof f.val === "string").map((f) => ({
        val: f.val.slice(0, 80),
        type: isCategory(f.type) ? f.type : "Custom",
        source: typeof f.source === "string" ? f.source : ""
      })) : [],
      refs: Array.isArray(w.refs) ? w.refs.filter((r) => !!r && typeof r.name === "string" && !!r.name).slice(0, 8).map((r) => ({
        name: r.name.slice(0, 40),
        img: typeof r.img === "string" && r.img.startsWith("data:image") ? r.img : null
      })) : [],
      cards: w.cards.map(asCard).filter((c) => !!c)
    };
  }
  function listWorkflows() {
    const raw = readJSON(WORKFLOWS_KEY);
    if (!Array.isArray(raw)) return [];
    return raw.map(asWorkflow).filter((w) => !!w);
  }
  function getWorkflow(id) {
    var _a;
    return (_a = listWorkflows().find((w) => w.id === id)) != null ? _a : null;
  }
  function saveWorkflow(wf) {
    const rest = listWorkflows().filter((w) => w.id !== wf.id);
    writeJSON(WORKFLOWS_KEY, [wf, ...rest].slice(0, MAX_WORKFLOWS));
    return wf;
  }
  function removeWorkflow(id) {
    writeJSON(WORKFLOWS_KEY, listWorkflows().filter((w) => w.id !== id));
  }
  function autosaveCanvas(wf) {
    writeJSON(CANVAS_KEY, wf);
  }
  function loadCanvasAutosave() {
    return asWorkflow(readJSON(CANVAS_KEY));
  }
  function clearCanvasAutosave() {
    remove(CANVAS_KEY);
  }

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
    var _a, _b;
    return (_b = (_a = READ_PHRASES[cat]) == null ? void 0 : _a[read]) != null ? _b : read;
  }
  var capStr = (s, n) => String(s != null ? s : "").trim().slice(0, n);
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
  var listJoin = (xs) => {
    var _a;
    return xs.length <= 1 ? (_a = xs[0]) != null ? _a : "" : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
  };
  function ingredientPhrase(cat, ing, valText) {
    var _a;
    const src = ing.source && ing.source.toLowerCase() !== "you" ? ` (from ${ing.source})` : "";
    const reads = ((_a = ing.reads) != null ? _a : []).map((r) => readingPhrase(cat, r));
    return (valText != null ? valText : ing.val) + src + (reads.length ? ", " + listJoin(reads) : "");
  }
  function weaveSentences(f, opts = {}) {
    var _a, _b;
    const strong = (_a = opts.strong) != null ? _a : ((t) => t);
    const ph = (cat) => (ing) => ingredientPhrase(cat, ing, opts.chip ? opts.chip(ing, cat) : void 0);
    const out = [];
    const sil = ((_b = f.silhouette) != null ? _b : "").trim().toLowerCase();
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

  // src/index.ts
  var buildPocket2 = buildPocket;
  var savePocket = save;
  var loadPocket = load;
  var clearPocket = clear;
  var migratePocket = migrate;
  var textWords2 = textWords;
  var toLitWord2 = toLitWord;
  var readIncoming2 = readIncoming;
  var canvasHref2 = canvasHref;
  var wordHref2 = wordHref;
  var encodeSeed = encode;
  var classifyWord = classify;
  var classifyOwn2 = classifyOwn;
  var overrideCategory = override;
  var growFor = grow;
  var setGrowEngine = setEngine;
  var currentGrowEngine = currentEngine;
  var cannedEngine2 = cannedEngine;
  var llmEngine2 = llmEngine;
  var proposePrompt2 = proposePrompt;
  var describePrompt2 = describePrompt;
  var growImage2 = growImage;
  var describeImage2 = describeImage;
  var prepRefImage2 = prepRefImage;
  var MOODPIX2 = MOODPIX;
  var weaveSentences2 = weaveSentences;
  var ingredientPhrase2 = ingredientPhrase;
  var readingPhrase2 = readingPhrase;
  var asFormula2 = asFormula;
  var storageBackend2 = storageBackend;
  var isPersistent2 = isPersistent;
  var listWorkflows2 = listWorkflows;
  var getWorkflow2 = getWorkflow;
  var saveWorkflow2 = saveWorkflow;
  var removeWorkflow2 = removeWorkflow;
  var newWorkflowId2 = newWorkflowId;
  var autosaveCanvas2 = autosaveCanvas;
  var loadCanvasAutosave2 = loadCanvasAutosave;
  var clearCanvasAutosave2 = clearCanvasAutosave;
  return __toCommonJS(index_exports);
})();
