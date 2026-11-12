// start.ng game host: serves static games from an R2 bucket.
// Rule: the subdomain is the folder name. dave.start.ng/x -> dave/x

export const CONTENT_TYPES = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  map: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  mp4: "video/mp4",
  webm: "video/webm",
  wasm: "application/wasm",
};

// Folder names: lowercase letters, digits, hyphens. No leading/trailing hyphen.
const NAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

function parseList(value) {
  return (value || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// A small start.ng page for a game address that can't show a game (hidden, or nothing there). Its colours are
// start.ng's own (src/styles.css), written out because this page is served without the app's stylesheet.
function infoPage({ status, title, heading, text, link, label }, method) {
  const body = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${title} · start.ng</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f5ee;color:#292a23;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;padding:24px}
main{max-width:440px;background:#fffefa;border:1px solid #e4e2d6;border-radius:18px;padding:28px;box-shadow:6px 6px 0 #d8fd71}
h1{margin:0 0 10px;font-size:1.6rem;letter-spacing:-.02em}p{margin:0 0 18px;color:#6b6c63;line-height:1.5}
a{display:inline-block;background:#292a23;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px}
@media (prefers-color-scheme:dark){body{background:#292a23;color:#f6f5ee}main{background:#33342c;border-color:#4a4b41}p{color:#b0b1a6}a{background:#f6f5ee;color:#292a23}}</style>
<main><h1>${heading}</h1><p>${text}</p>
<a href="${link}">${label}</a></main></html>`;
  return new Response(method === "HEAD" ? null : body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "no-store" },
  });
}

// A page address (/, /save, /level.html) is one a person opens: it gets a start.ng page with a way back. A file a game
// loads (/game.js, /img/a.png) keeps a plain 404, which is all the game's code needs.
function isPagePath(pathname) {
  const last = pathname.split("/").pop() || "";
  return !last.includes(".") || /\.html?$/i.test(last);
}

function notFound(pathname, siteUrl, method) {
  if (isPagePath(pathname)) {
    return infoPage({
      status: 404,
      title: "Game not found",
      heading: "There's no game here",
      text: "Nothing is published at this address. Check the spelling, or find a game to play on start.ng.",
      link: `${siteUrl}/games`,
      label: "Browse games on start.ng",
    }, method);
  }
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff" },
  });
}

// A game start.ng's admins have hidden has an empty object at _hidden/<name> (startng-be app/storage.py). It sits
// outside every game's folder, so no game can write or serve it. Its address then shows this page instead.
export const HIDDEN_PREFIX = "_hidden/";

function unavailable(siteUrl, method) {
  return infoPage({
    status: 410,
    title: "Game unavailable",
    heading: "This game isn't available",
    text: "It has been taken down from start.ng. If it's yours, check Your games on start.ng to see why.",
    link: siteUrl,
    label: "Find other games on start.ng",
  }, method);
}

async function isHidden(bucket, name) {
  // head() is the cheap check on R2; the local dev server's stand-in only has get().
  const found = bucket.head ? await bucket.head(HIDDEN_PREFIX + name) : await bucket.get(HIDDEN_PREFIX + name);
  return found !== null && found !== undefined;
}

// Returns the game name for a host, or null if the host is not a game host.
export function gameNameFromHost(hostname, baseDomain) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const suffix = "." + baseDomain.toLowerCase();
  if (!host.endsWith(suffix)) return null;
  return host.slice(0, -suffix.length);
}

// Turns a URL path into a safe bucket key under the game folder, or null.
export function keyForPath(name, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0") || decoded.includes("\\")) return null;

  const hasTrailingSlash = decoded.endsWith("/");
  const segments = decoded.split("/").filter((s) => s !== "");
  // Reject "..", ".", and hidden files such as ".git" or ".env".
  if (segments.some((s) => s.startsWith("."))) return null;

  const last = segments[segments.length - 1] || "";
  const isFile = !hasTrailingSlash && last.includes(".");
  const path = segments.join("/");
  if (isFile) return `${name}/${path}`;
  return path ? `${name}/${path}/index.html` : `${name}/index.html`;
}

function contentTypeFor(key, object) {
  const ext = key.split(".").pop().toLowerCase();
  return CONTENT_TYPES[ext] || object.httpMetadata?.contentType || "application/octet-stream";
}

export default {
  async fetch(request, env) {
    const baseDomain = env.BASE_DOMAIN || "start.ng";
    const reserved = parseList(env.RESERVED_NAMES);
    const url = new URL(request.url);
    const name = gameNameFromHost(url.hostname, baseDomain);

    // Not a subdomain of the base domain: leave the request alone.
    if (name === null) return fetch(request);
    // Reserved names are never served from the bucket. Send them on to wherever they live now.
    if (reserved.includes(name)) return fetch(request);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }
    const site = (env.SITE_URL || `https://${baseDomain}`).replace(/\/$/, "");
    // Only a single label is a game (a.b.start.ng is not).
    if (!NAME_RE.test(name)) return notFound(url.pathname, site, request.method);

    const key = keyForPath(name, url.pathname);
    if (!key) return notFound(url.pathname, site, request.method);

    if (await isHidden(env.GAMES_BUCKET, name)) return unavailable(site, request.method);

    const object = await env.GAMES_BUCKET.get(key);
    if (!object) return notFound(url.pathname, site, request.method);

    const headers = new Headers();
    headers.set("content-type", contentTypeFor(key, object));
    headers.set("x-content-type-options", "nosniff");
    headers.set("cache-control", env.CACHE_CONTROL || "public, max-age=60");
    if (object.httpEtag) headers.set("etag", object.httpEtag);

    return new Response(request.method === "HEAD" ? null : object.body, { status: 200, headers });
  },
};
