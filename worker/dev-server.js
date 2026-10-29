// Local stand-in for Cloudflare: runs the real Worker code against a folder on disk.
// The folder plays the role of the R2 bucket: games/dave/index.html is dave/index.html.
//
//   npm run dev                      serves ./sample-game on port 8787
//   GAMES_DIR=../my-games npm run dev
//
// Open http://dave.localhost:8787 (Chrome and Firefox resolve *.localhost on their own).
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker from "./src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const gamesDir = path.resolve(process.env.GAMES_DIR || path.join(here, "sample-game"));
const port = Number(process.env.PORT || 8787);
const baseDomain = process.env.BASE_DOMAIN || "localhost";

// Same shape as an R2 bucket binding for what the Worker uses: head(key) and get(key, { range }) -> object or null.
const bucket = {
  async head(key) {
    const file = path.resolve(gamesDir, key);
    if (!file.startsWith(gamesDir + path.sep)) return null;
    try {
      const { mtimeMs, size } = await fs.stat(file);
      return { size, httpEtag: `"${size}-${Math.floor(mtimeMs)}"`, httpMetadata: {} };
    } catch {
      return null;
    }
  },
  async get(key, options) {
    const meta = await this.head(key);
    if (!meta) return null;
    const whole = await fs.readFile(path.resolve(gamesDir, key));
    const r = options?.range;
    return { ...meta, body: r ? whole.subarray(r.offset, r.offset + r.length) : whole };
  },
};

const env = {
  BASE_DOMAIN: baseDomain,
  RESERVED_NAMES: process.env.RESERVED_NAMES || "api,auth,login,www,3rdmainland",
  CACHE_CONTROL: "no-store", // always show the latest files while developing
  SITE_URL: process.env.SITE_URL, // where "Find other games" links on a hidden game (default https://<BASE_DOMAIN>)
  GAMES_BUCKET: bucket,
};

// In production the Worker hands reserved names and the bare domain on to the normal origin.
// There is no origin locally, so answer with a simple page instead.
async function localOrigin(request) {
  const url = new URL(request.url);
  const name = url.hostname.split(".")[0];
  if (url.hostname !== baseDomain) {
    return new Response(`"${name}" is reserved and is not served from the bucket.`, { status: 404 });
  }
  const games = (await fs.readdir(gamesDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
  const links = games.map((g) => `<li><a href="http://${g}.${baseDomain}:${port}/">${g}.${baseDomain}</a></li>`);
  return new Response(`<!doctype html><meta charset="utf-8"><title>Local games</title><h1>Local games</h1><ul>${links.join("")}</ul>`, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
globalThis.fetch = localOrigin;

http
  .createServer(async (req, res) => {
    // The browser's headers go along too (Range, for audio and video).
    const headers = Object.entries(req.headers).filter(([, v]) => typeof v === "string");
    const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers });
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  })
  .listen(port, () => {
    console.log(`Serving ${gamesDir}`);
    console.log(`Home:  http://${baseDomain}:${port}/`);
    console.log(`Games: http://<folder>.${baseDomain}:${port}/   e.g. http://dave.${baseDomain}:${port}/`);
  });
