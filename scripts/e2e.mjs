/* Drives the whole three-page loop in a real browser: light words in the
   garden, hand off, hydrate the canvas, read the pocket in the library, then
   do it again with localStorage blocked. Also proves the token single-source
   holds across every page, and that the grow engine works through /api/grow
   (mocked) and falls back to canned when the endpoint is down.

   `npm run e2e`. Needs a local Chrome. Two servers are spawned:
     :5173 GROW_OFF=1   the endpoint answers 503 -> canned fallback path
     :5174 GROW_MOCK=1  the endpoint answers fixed words -> LLM path       */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";

const PORT_OFF = 5173;
const PORT_MOCK = 5174;
const BASE = "http://127.0.0.1:" + PORT_OFF;
const BASE_MOCK = "http://127.0.0.1:" + PORT_MOCK;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

let fails = 0;
const ok = (c, msg) => { console.log((c ? "  ok   " : "  FAIL ") + msg); if (!c) fails++; };

const servers = [
  spawn("node", ["scripts/serve.mjs"], { stdio: "ignore", env: { ...process.env, PORT: String(PORT_OFF), GROW_OFF: "1" } }),
  spawn("node", ["scripts/serve.mjs"], { stdio: "ignore", env: { ...process.env, PORT: String(PORT_MOCK), GROW_MOCK: "1" } }),
];
const done = (code) => { servers.forEach((s) => s.kill()); process.exit(code); };
process.on("uncaughtException", (e) => { console.error(e); done(1); });
await new Promise((r) => setTimeout(r, 900));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
/* favicon is the browser asking; webfonts fail in offline/headless sandboxes */
const noise = (u) => /favicon\.ico|fonts\.gstatic\.com|fonts\.googleapis\.com/.test(u);
page.on("pageerror", (e) => errs.push("pageerror: " + e));
page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errs.push("console: " + m.text()); });
page.on("response", (r) => { if (r.status() >= 400 && !noise(r.url()) && !/\/api\/grow/.test(r.url())) errs.push("HTTP " + r.status() + " " + r.url()); });
page.on("requestfailed", (r) => { if (!noise(r.url())) errs.push("requestfailed: " + r.url()); });

/* ---------- 0. TOKENS: one palette across every page ---------- */
console.log("\n0. tokens.css — single source holds on every page");
const TOKEN_PAGES = ["home.html", "start.html", "mvp_v6.html", "library.html", "innovogue-v23.html"];
const seen = {};
for (const p of TOKEN_PAGES) {
  await page.goto(BASE + "/" + p);
  seen[p] = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    const v = (k) => s.getPropertyValue(k).trim().toLowerCase();
    return { pink: v("--pink"), hot: v("--pink-hot"), bg: v("--bg"), card: v("--card"), canvas: v("--canvas") };
  });
}
const want = { pink: "#f493be", hot: "#ff8fc2", bg: "#141114", card: "#1d191c", canvas: "#182019" };
for (const [k, expected] of Object.entries(want)) {
  const values = TOKEN_PAGES.map((p) => seen[p][k]);
  ok(values.every((v) => v === expected), `--${k === "hot" ? "pink-hot" : k} = ${expected} on all ${TOKEN_PAGES.length} pages` + (values.every((v) => v === expected) ? "" : " (got " + values.join(", ") + ")"));
}
const budgetLocal = await page.evaluate(async (b) => (await fetch(b + "/api/budget")).json(), BASE);
ok(budgetLocal.cap === 50, "/api/budget reports the $50 cap (got " + JSON.stringify(budgetLocal) + ")");

/* ---------- 1. START ---------- */
console.log("\n1. start.html — the garden");
await page.goto(BASE + "/start.html");
await page.waitForFunction(() => typeof window.DD !== "undefined");
ok(true, "DD core loaded");
const engine = await page.evaluate(() => window.DD.currentGrowEngine());
ok(engine === "llm", "llm engine is wired at boot (got " + engine + ")");

await page.click('.gc[data-k="Betta Fish"]');
await page.waitForFunction(() => document.querySelectorAll(".gnode").length >= 4, { timeout: 4000 });
const grown = await page.evaluate(() => document.querySelectorAll(".gnode").length);
ok(grown >= 4, "garden grew " + grown + " nodes");

/* keyboard gesture */
await page.evaluate(() => {
  const words = nodes.filter((n) => n.kind === "word");
  for (const n of words.slice(0, 2)) { n.el.focus(); light(n); }
});
const litCount = await page.evaluate(() => litOrder.length);
ok(litCount === 2, "two words lit with the keyboard gesture (got " + litCount + ")");

/* real long-press gesture */
const t = await page.evaluate(async () => {
  const n = nodes.filter((x) => x.kind === "word" && !x.lit)[0];
  if (!n) return null;
  n.el.scrollIntoView({ block: "center", behavior: "instant" });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const r = n.el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, word: n.t };
});
ok(!!t, "an unlit word is available to press");
if (t) {
  await page.mouse.move(t.x, t.y);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  const after = await page.evaluate(() => litOrder.length);
  ok(after === 3, "long-press lit a third word (got " + after + ")");
}

ok((await page.getAttribute("#goBtn", "aria-disabled")) === "false", "canvas button unlocked");

const litWords = await page.evaluate(() =>
  litOrder.map((id) => nodes.find((n) => n.id === id)).filter((n) => n.kind === "word").map((n) => n.t));
console.log("     lit: " + litWords.join(", "));

await page.click("#goBtn");
await page.waitForURL(/mvp_v6\.html/, { timeout: 5000 });
const url = page.url();
ok(url.includes("seed=dd1."), "handoff carries the pocket in the link");

/* ---------- 2. CANVAS ---------- */
console.log("\n2. mvp_v6.html — the canvas");
await page.waitForFunction(() => document.querySelectorAll(".tag").length > 0);
const palette = await page.evaluate(() => ({
  sub: document.getElementById("featSub").textContent,
  tags: [...document.querySelectorAll(".tag")].map((x) => x.textContent),
  groups: [...document.querySelectorAll(".feat-group h4")].map((h) => h.textContent),
}));
ok(palette.tags.length === litWords.length, palette.tags.length + " lit words became the palette");
ok(litWords.every((w) => palette.tags.includes(w)), "every lit word arrived, none invented");
ok(/you lit/.test(palette.sub), "panel credits the words to the user");
console.log("     sub:    " + palette.sub);
console.log("     groups: " + palette.groups.join(" | "));

/* the moss canvas: the board is the one cool surface */
const boardBg = await page.evaluate(() => getComputedStyle(document.querySelector("#board")).backgroundColor);
ok(boardBg === "rgb(24, 32, 25)", "board sits on the moss canvas (got " + boardBg + ")");

const tag = await page.$(".tag"), board = await page.$("#board");
const tb = await tag.boundingBox(), bb = await board.boundingBox();
await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
await page.mouse.down();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(300);
const placed = await page.evaluate(() => state.cards.length);
ok(placed === 1, "dragging a lit word onto the board makes a card (got " + placed + ")");

/* ---------- 3. LIBRARY ---------- */
console.log("\n3. library.html — the pocket");
await page.goto(BASE + "/library.html");
await page.waitForFunction(() => document.querySelectorAll(".pkw").length > 0);
const pk = await page.evaluate(() => ({
  words: [...document.querySelectorAll(".pkw:not(.pkall)")].map((a) => a.textContent),
  count: document.getElementById("pkCount").textContent,
  all: document.querySelector(".pkall") ? document.querySelector(".pkall").getAttribute("href") : "",
  titles: [...document.querySelectorAll(".pkw:not(.pkall)")].map((a) => a.title),
}));
ok(!pk.count.includes("sample"), "pocket shows the real session, not the demo");
ok(litWords.every((w) => pk.words.includes(w)), "the lit words are in the pocket");
ok(pk.all.includes("dd1."), "'take all' carries the whole pocket");
ok(pk.titles.some((x) => /grew from/.test(x)), "lineage survived into the library");
console.log("     count: " + pk.count.replace(/\s+/g, " ").trim());

/* ---------- 4. sandboxed: localStorage throws ---------- */
console.log("\n4. sandboxed environment — localStorage throws");
const sealed = await browser.newContext();
await sealed.addInitScript(() => {
  Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
});
const p2 = await sealed.newPage();
await p2.goto(BASE + "/mvp_v6.html" + url.slice(url.indexOf("?")));
await p2.waitForFunction(() => typeof window.DD !== "undefined");
const sealedTags = await p2.evaluate(() => [...document.querySelectorAll(".tag")].map((x) => x.textContent));
const backend = await p2.evaluate(() => window.DD.storageBackend());
ok(backend === "memory", "storage degraded to " + backend + " instead of throwing");
ok(sealedTags.length === litWords.length, "canvas still hydrated with " + sealedTags.length + " words from the link alone");

/* ---------- 5. the LLM path: /api/grow answers, its words enter the garden ---------- */
console.log("\n5. /api/grow up (mock) — the model proposes, the garden shows it");
const p5 = await (await browser.newContext()).newPage();
await p5.goto(BASE_MOCK + "/start.html");
await p5.waitForFunction(() => typeof window.DD !== "undefined");
await p5.click('.gc[data-k="Betta Fish"]');
await p5.waitForFunction(() => document.querySelectorAll(".gnode").length >= 4, { timeout: 4000 });
await p5.evaluate(() => grow(nodes.find((n) => n.kind === "word")));
const mockHit = await p5.waitForFunction(
  () => [...document.querySelectorAll(".gnode")].some((n) => n.textContent.includes("moth-wing grey")),
  { timeout: 6000 }
).then(() => true).catch(() => false);
ok(mockHit, "a word from the endpoint ('moth-wing grey') grew into the garden");
const still = await p5.evaluate(() => nodes.filter((n) => n.kind === "word").map((n) => n.t));
ok(still.length >= 4, "the model added to the garden without replacing it (" + still.length + " words)");

/* generated mood image: call the (normally dice-gated) helper directly */
await p5.evaluate(() => maybeGrowImage(nodes.find((n) => n.kind === "word"), "flow"));
const imgGrew = await p5.waitForFunction(
  () => nodes.some((n) => n.kind === "image" && typeof n.src === "string" && n.src.startsWith("data:image")),
  { timeout: 6000 }
).then(() => true).catch(() => false);
ok(imgGrew, "a generated mood image grew into the garden as a node");

/* the canvas AI preview, endpoint up: formula -> image */
await p5.goto(BASE_MOCK + "/mvp_v6.html?seed=iridescent");
await p5.waitForFunction(() => document.querySelectorAll(".tag").length > 0);
const tag5 = await p5.$(".tag"), board5 = await p5.$("#board");
const tb5 = await tag5.boundingBox(), bb5 = await board5.boundingBox();
await p5.mouse.move(tb5.x + tb5.width / 2, tb5.y + tb5.height / 2);
await p5.mouse.down();
await p5.mouse.move(bb5.x + bb5.width / 2, bb5.y + bb5.height / 2, { steps: 8 });
await p5.mouse.up();
await p5.evaluate(() => document.querySelector("#silChips .chip").scrollIntoView({ block: "center" }));
await p5.click("#silChips .chip");
await p5.click("#poseChips .chip");
await p5.click("#btnLock");
ok(!(await p5.evaluate(() => document.getElementById("btnRender").disabled)), "AI preview unlocks with a locked model + a card");
await p5.click("#btnRender");
const rendered = await p5.waitForFunction(
  () => { const i = document.querySelector("#aiWrap img"); return !!i && i.getAttribute("src").startsWith("data:image"); },
  { timeout: 8000 }
).then(() => true).catch(() => false);
ok(rendered, "AI preview rendered the formula into an image");

/* ---------- 6. the fallback path: /api/grow down, canned keeps growing ---------- */
console.log("\n6. /api/grow down (503) — canned fallback keeps the garden alive");
const p6 = await (await browser.newContext()).newPage();
await p6.goto(BASE + "/start.html");
await p6.waitForFunction(() => typeof window.DD !== "undefined");
await p6.click('.gc[data-k="Betta Fish"]');
await p6.waitForFunction(() => document.querySelectorAll(".gnode").length >= 4, { timeout: 4000 });
await p6.evaluate(() => grow(nodes.find((n) => n.kind === "word" && n.t === "iridescent")));
const cannedHit = await p6.waitForFunction(
  () => ["oil-slick sheen", "prismatic", "beetle-wing"].some((w) =>
    [...document.querySelectorAll(".gnode")].some((n) => n.textContent.includes(w))),
  { timeout: 6000 }
).then(() => true).catch(() => false);
ok(cannedHit, "canned association appeared although the endpoint is down");

/* image fallback: helper called with the endpoint down -> canned MOODPIX */
await p6.evaluate(() => maybeGrowImage(nodes.find((n) => n.kind === "word"), "flow"));
const moodFallback = await p6.waitForFunction(
  () => nodes.filter((n) => n.kind === "image").length >= 2,
  { timeout: 8000 }
).then(() => true).catch(() => false);
ok(moodFallback, "mood image fell back to the canned pool with the endpoint down");

/* the canvas AI preview, endpoint down: graceful message, sketches intact */
await p6.goto(BASE + "/mvp_v6.html?seed=iridescent");
await p6.waitForFunction(() => document.querySelectorAll(".tag").length > 0);
const tag6 = await p6.$(".tag"), board6 = await p6.$("#board");
const tb6 = await tag6.boundingBox(), bb6 = await board6.boundingBox();
await p6.mouse.move(tb6.x + tb6.width / 2, tb6.y + tb6.height / 2);
await p6.mouse.down();
await p6.mouse.move(bb6.x + bb6.width / 2, bb6.y + bb6.height / 2, { steps: 8 });
await p6.mouse.up();
await p6.click("#silChips .chip");
await p6.click("#poseChips .chip");
await p6.click("#btnLock");
await p6.click("#btnRender");
const gentleFail = await p6.waitForFunction(
  () => /couldn.t render/.test(document.getElementById("aiWrap").textContent),
  { timeout: 8000 }
).then(() => true).catch(() => false);
ok(gentleFail, "AI preview fails gently when the endpoint is down");

/* ---------- 7. palette bench ---------- */
console.log("\n7. palette.html — one switch, four pages");
const p7 = await (await browser.newContext()).newPage();
await p7.goto(BASE + "/palette.html");
await p7.waitForFunction(() => {
  const fs = [...document.querySelectorAll("iframe")];
  return fs.length === 4 && fs.every((f) => { try { return f.contentDocument && f.contentDocument.readyState === "complete"; } catch { return false; } });
}, { timeout: 15000 });
ok(true, "all four pages loaded into the bench");
await p7.click(".chip:nth-child(2)"); /* 墨黑 · old ink */
await p7.waitForTimeout(200);
const switched = await p7.evaluate(() =>
  [...document.querySelectorAll("iframe")].map((f) => f.contentDocument.documentElement.style.getPropertyValue("--bg").trim()));
ok(switched.every((v) => v === "#070706"), "switching one chip re-skinned all four pages (got " + switched.join(",") + ")");
await p7.click(".chip:nth-child(1)");
await p7.waitForTimeout(200);
const restored = await p7.evaluate(() =>
  [...document.querySelectorAll("iframe")].map((f) => f.contentDocument.documentElement.style.getPropertyValue("--bg").trim()));
ok(restored.every((v) => v === ""), "switching back restores the tokens.css default");

console.log("\njs errors: " + (errs.length ? "\n  " + errs.join("\n  ") : "none"));
fails += errs.length;
await browser.close();
console.log(fails ? "\n" + fails + " FAILING" : "\nloop closes end to end");
done(fails ? 1 : 0);
