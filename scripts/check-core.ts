import { classify } from "../src/classify.js";
import { migrate, buildPocket } from "../src/pocket.js";
import { encode, readIncoming } from "../src/seed.js";

let fails = 0;
const ok = (c: boolean, msg: string) => { if (!c) { fails++; console.log("  FAIL " + msg); } };

/* --- 1. classifier over the whole canned vocabulary --- */
const EXPECT: Array<[string, string]> = [
  ["iridescent", "Pattern"], ["gossamer", "Pattern"], ["organza veil", "Pattern"],
  ["trailing threads", "Pattern"], ["radial pleats", "Pattern"], ["raw seam", "Pattern"],
  ["frayed edge", "Pattern"], ["woven grain", "Pattern"], ["tactile relief", "Pattern"],
  ["sharp pleats", "Pattern"], ["hand-stitched", "Pattern"], ["soft matte", "Pattern"],
  ["mirrored panels", "Pattern"], ["central seam", "Pattern"], ["clean seam", "Pattern"],
  ["floating hem", "Silhouette"], ["ripple hem", "Silhouette"], ["fluid drape", "Silhouette"],
  ["liquid drape", "Silhouette"], ["tentacle drape", "Silhouette"], ["bias cut", "Silhouette"],
  ["organic curve", "Silhouette"], ["negative space", "Silhouette"], ["structured shell", "Silhouette"],
  ["exaggerated hip", "Silhouette"], ["spiral wrap", "Silhouette"], ["single line", "Silhouette"],
  ["asymmetry", "Silhouette"], ["opening form", "Silhouette"], ["silhouette", "Silhouette"],
  ["ivory", "Color"], ["bone white", "Color"], ["warm cream", "Color"], ["blush ombre", "Color"],
  ["gradient wash", "Color"], ["monochrome", "Color"], ["undertone", "Color"], ["backlit glow", "Color"],
  ["weightless", "Symbolic"], ["surrender", "Symbolic"], ["quiet balance", "Symbolic"],
  ["one gesture", "Symbolic"], ["slow motion", "Symbolic"], ["suspended", "Symbolic"],
  ["atmosphere", "Symbolic"], ["drift", "Symbolic"], ["transformation & rebirth", "Symbolic"],
];
console.log("1. classifier");
for (const [term, want] of EXPECT) {
  const r = classify(term);
  ok(r.category === want, `"${term}" -> ${r.category} (want ${want}, matched "${r.why}")`);
}
console.log(`   ${EXPECT.length - fails}/${EXPECT.length} readings correct`);

/* --- 2. the legacy pocket that library.html could never read --- */
console.log("2. legacy migration");
const legacyBefore = fails;
const legacy = {
  ref: "Betta Fish + Orchid",
  items: [
    { t: "iridescent", img: null, from: "betta fins", depth: 1 },
    { t: "ripple hem", img: null, from: "flow", depth: 2 },
    { t: null, img: "images/case03.png", from: "petals", depth: 2 },
    { t: "surrender", img: null, from: "seed", depth: 1 },
  ],
};
const m = migrate(legacy);
ok(!!m, "legacy pocket migrates at all");
ok(m?.words.length === 4, `4 items carried over (got ${m?.words.length})`);
ok(m?.refs.length === 2, `refs split into 2 (got ${m?.refs.length})`);
ok(m?.words[0]?.category === "Pattern", "iridescent read as Pattern");
ok(m?.words[2]?.kind === "image", "the image node survives as an image");
ok(m?.words[1]?.from === "flow", "lineage preserved");
console.log(fails === legacyBefore ? "   old sessions survive" : "   BROKEN");

/* --- 3. seed link round-trip, no storage involved --- */
console.log("3. seed round-trip");
const rtBefore = fails;
const p = buildPocket("Betta Fish", ["Betta Fish"], [
  { text: "iridescent", from: "betta fins", depth: 1 },
  { text: "ripple hem", from: "flow", depth: 2 },
  { text: "surrender", from: "seed", depth: 1 },
]);
const token = encode(p);
const back = readIncoming("?seed=" + encodeURIComponent(token));
ok(back.source === "link", `source is link (got ${back.source})`);
ok(back.pocket.words.length === 3, `3 words survive the URL (got ${back.pocket.words.length})`);
ok(back.pocket.words[0]?.text === "iridescent", "text survives");
ok(back.pocket.words[0]?.category === "Pattern", "category survives");
ok(back.pocket.words[1]?.from === "flow", "lineage survives the URL");
ok(back.pocket.ref === "Betta Fish", "reference survives");
console.log(`   url length: ${("mvp_v6.html?seed=" + encodeURIComponent(token)).length} chars`);

/* legacy bare-word link from library.html */
const bare = readIncoming("?seed=weightlessness");
ok(bare.source === "word", `bare word recognised (got ${bare.source})`);
ok(bare.pocket.words.length === 1, "bare word becomes a pocket of one");

/* nothing at all */
const none = readIncoming("");
ok(none.source === "none", `empty search -> none (got ${none.source})`);
console.log(fails === rtBefore ? "   link carries the pocket with no storage" : "   BROKEN");

console.log(fails ? `\n${fails} FAILING` : "\nall green");
process.exit(fails ? 1 : 0);
