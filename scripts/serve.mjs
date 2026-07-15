/* Local dev server: static files + the same /api/grow that runs on Vercel.
   `npm run serve` (or `npm run dev` to build first). Reads GEMINI_API_KEY
   from .env so the real association engine works locally too.

   Modes, for tests:
     GROW_MOCK=1   /api/grow answers instantly with fixed words (no network)
     GROW_OFF=1    /api/grow answers 503 (exercises the canned fallback)     */

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { growWords } from "../api/grow.mjs";
import { renderImage } from "../api/image.mjs";
import { budget } from "../api/_budget.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 5173);

/* .env + .env.local (vercel pull) — one KEY=value per line. Real env wins. */
const env = {
  ...loadDotEnv(join(ROOT, ".env")),
  ...loadDotEnv(join(ROOT, ".env.local")),
  ...process.env,
};

function loadDotEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*("?)(.*)\2\s*$/i);
    if (m) out[m[1]] = m[3];
  }
  return out;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
};

const MOCK_WORDS = ["moth-wing grey", "hidden seam", "after-rain sheen"];
/* 1x1 pink png, instant, free */
const MOCK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/grow") {
    if (req.method !== "POST") {
      res.writeHead(405, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "POST only" }));
      return;
    }
    if (env.GROW_MOCK) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ words: MOCK_WORDS }));
      return;
    }
    if (env.GROW_OFF) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "grow disabled (GROW_OFF)" }));
      return;
    }
    try {
      const words = await growWords(await readBody(req), env);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ words }));
    } catch (e) {
      const status = e.status === 400 ? 400 : e.status === 503 ? 503 : 502;
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e.message ?? e).slice(0, 300) }));
    }
    return;
  }

  if (url.pathname === "/api/image") {
    if (req.method !== "POST") {
      res.writeHead(405, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "POST only" }));
      return;
    }
    if (env.GROW_MOCK) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ image: MOCK_IMAGE }));
      return;
    }
    if (env.GROW_OFF) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "grow disabled (GROW_OFF)" }));
      return;
    }
    try {
      const image = await renderImage(await readBody(req), env);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ image }));
    } catch (e) {
      const status = [400, 402, 503].includes(e.status) ? e.status : 502;
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e.message ?? e).slice(0, 300) }));
    }
    return;
  }

  if (url.pathname === "/api/budget") {
    const b = env.GROW_MOCK || env.GROW_OFF
      ? { spent: 0, cap: 50, left: 50, calls: 0, persistent: false }
      : await budget(env);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(b));
    return;
  }

  /* static, jailed to ROOT. never serve dotfiles: .env lives here. */
  let path = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!path) path = "home.html";
  path = normalize(path);
  if (path === "." ) path = "home.html";
  const full = join(ROOT, path);
  const base = path.split("/").pop() ?? "";
  if (!full.startsWith(ROOT) || base.startsWith(".") || path.startsWith("node_modules")) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  if (!existsSync(full) || !statSync(full).isFile()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(full)] ?? "application/octet-stream" });
  res.end(readFileSync(full));
});

server.listen(PORT, () => {
  const mode = env.GROW_MOCK ? "mock" : env.GROW_OFF ? "off (503)" : env.GEMINI_API_KEY ? "gemini" : "unconfigured (503 -> canned fallback)";
  console.log(`serving ${ROOT}`);
  console.log(`http://127.0.0.1:${PORT}/home.html   [/api/grow: ${mode}]`);
});
