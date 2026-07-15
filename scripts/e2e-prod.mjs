/* The production check: the deployed site, the real Gemini endpoint, a real
   browser. Words from the live model are non-deterministic, so the LLM
   assertions are structural (endpoint answered 200, new nodes grew) rather
   than textual. `node scripts/e2e-prod.mjs [base-url]` */
import { chromium } from "playwright-core";

const BASE = process.argv[2] || "https://innovogue.vercel.app";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

let fails = 0;
const ok = (c, msg) => { console.log((c ? "  ok   " : "  FAIL ") + msg); if (!c) fails++; };

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await (await browser.newContext()).newPage();
const growCalls = [];
page.on("response", (r) => { if (r.url().includes("/api/grow")) growCalls.push(r.status()); });

console.log("\nverifying " + BASE);

/* ---- start: garden + real LLM ---- */
await page.goto(BASE + "/start.html");
await page.waitForFunction(() => typeof window.DD !== "undefined");
ok(true, "start.html up, DD core loaded");
ok(await page.evaluate(() => window.DD.currentGrowEngine()) === "llm", "llm engine wired");

await page.click('.gc[data-k="Betta Fish"]');
await page.waitForFunction(() => document.querySelectorAll(".gnode").length >= 4);
const before = await page.evaluate(() => nodes.filter((n) => n.kind === "word").length);

await page.evaluate(() => grow(nodes.find((n) => n.kind === "word")));
await page.waitForFunction(
  (n) => nodes.filter((x) => x.kind === "word").length > n,
  before,
  { timeout: 15000 }
);
const after = await page.evaluate(() => nodes.filter((n) => n.kind === "word").length);
const fresh = await page.evaluate((n) => nodes.filter((x) => x.kind === "word").slice(n).map((x) => x.t), before);
ok(growCalls.includes(200), "/api/grow answered 200 from the live endpoint");
ok(after > before, "the model grew " + (after - before) + " new association(s): " + fresh.join(", "));

/* ---- light two, hand off ---- */
await page.evaluate(() => {
  const words = nodes.filter((n) => n.kind === "word");
  for (const n of words.slice(0, 2)) light(n);
});
await page.click("#goBtn");
await page.waitForURL(/mvp_v6\.html/);
ok(page.url().includes("seed=dd1."), "handoff link carries the pocket");

/* ---- canvas hydrates ---- */
await page.waitForFunction(() => document.querySelectorAll(".tag").length > 0);
const tags = await page.evaluate(() => [...document.querySelectorAll(".tag")].map((x) => x.textContent));
ok(tags.length === 2, "canvas palette holds the 2 lit words: " + tags.join(", "));

/* ---- library pocket ---- */
await page.goto(BASE + "/library.html");
await page.waitForFunction(() => document.querySelectorAll(".pkw").length > 0);
const count = await page.evaluate(() => document.getElementById("pkCount").textContent);
ok(!count.includes("sample"), "library pocket shows the real session (" + count.replace(/\s+/g, " ").trim() + ")");

/* ---- tokens on prod ---- */
const pink = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--pink").trim());
ok(pink.toLowerCase() === "#f493be", "tokens.css live on prod (--pink " + pink + ")");

/* ---- budget + one real image ---- */
const b0 = await (await fetch(BASE + "/api/budget")).json();
ok(b0.cap === 50 && b0.persistent === true, "$50 cap live with a persistent ledger (" + JSON.stringify(b0) + ")");
const ctl = new AbortController();
const timer = setTimeout(() => ctl.abort(), 55000);
const imgRes = await fetch(BASE + "/api/image", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ kind: "mood", term: "backlit glow" }),
  signal: ctl.signal,
}).catch((e) => ({ ok: false, statusText: String(e) }));
clearTimeout(timer);
const imgBody = imgRes.ok ? await imgRes.json() : {};
ok(imgRes.ok && typeof imgBody.image === "string" && imgBody.image.startsWith("data:image"),
  "live image generation works (" + (imgRes.ok ? Math.round(imgBody.image.length / 1024) + "KB" : imgRes.statusText) + ")");
/* blob reads propagate in ~a second; poll rather than read-once */
let b1 = b0;
for (let i = 0; i < 10 && !(b1.spent > b0.spent); i++) {
  await new Promise((r) => setTimeout(r, 800));
  b1 = await (await fetch(BASE + "/api/budget")).json();
}
ok(b1.spent > b0.spent, "the ledger booked it ($" + b0.spent + " -> $" + b1.spent + ")");

/* ---- palette bench ---- */
await page.goto(BASE + "/palette.html");
const benchOk = await page.waitForFunction(() => {
  const fs = [...document.querySelectorAll("iframe")];
  return fs.length === 4 && fs.every((f) => { try { return f.contentDocument?.readyState === "complete"; } catch { return false; } });
}, { timeout: 20000 }).then(() => true).catch(() => false);
ok(benchOk, "palette bench loads all four pages on prod");

await browser.close();
console.log(fails ? "\n" + fails + " FAILING" : "\nproduction loop closes end to end");
process.exit(fails ? 1 : 0);
