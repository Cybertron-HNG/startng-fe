import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { keyForPath, gameNameFromHost, parseRange } from "../src/index.js";

// Fake bucket: a plain object of key -> content.
function fakeBucket(files) {
  return {
    async head(key) {
      if (!Object.hasOwn(files, key)) return null;
      return { size: files[key].length, httpEtag: '"abc"', httpMetadata: {} };
    },
    async get(key, options) {
      if (!Object.hasOwn(files, key)) return null;
      const r = options?.range;
      return { body: r ? files[key].slice(r.offset, r.offset + r.length) : files[key], size: files[key].length, httpEtag: '"abc"', httpMetadata: {} };
    },
  };
}

const files = {
  "dave/index.html": "<h1>dave</h1>",
  "dave/save/index.html": "<h1>save</h1>",
  "dave/style.css": "body{}",
  "dave/game.js": "1",
  "dave/img/a.png": "png",
  "dave/font.woff2": "f",
  "dave/data.bin": "b",
  "dave/song.mp3": "0123456789",
  "other/index.html": "other",
};
const env = {
  BASE_DOMAIN: "start.ng",
  RESERVED_NAMES: "api,auth,login,www,3rdmainland",
  GAMES_BUCKET: fakeBucket(files),
};
const get = (url, init) => worker.fetch(new Request(url, init), env);

test("/ serves <folder>/index.html", async () => {
  const r = await get("https://dave.start.ng/");
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "<h1>dave</h1>");
  assert.match(r.headers.get("content-type"), /text\/html/);
});

test("/save serves <folder>/save/index.html (with and without slash)", async () => {
  for (const p of ["/save", "/save/"]) {
    const r = await get("https://dave.start.ng" + p);
    assert.equal(r.status, 200);
    assert.equal(await r.text(), "<h1>save</h1>");
  }
});

test("content types", async () => {
  const cases = {
    "/style.css": "text/css",
    "/game.js": "text/javascript",
    "/img/a.png": "image/png",
    "/font.woff2": "font/woff2",
    "/data.bin": "application/octet-stream",
  };
  for (const [p, type] of Object.entries(cases)) {
    const r = await get("https://dave.start.ng" + p);
    assert.equal(r.status, 200, p);
    assert.ok(r.headers.get("content-type").startsWith(type), p);
  }
});

test("404 for unknown folder, file, and path", async () => {
  for (const u of ["https://nope.start.ng/", "https://dave.start.ng/missing.js", "https://dave.start.ng/nothere"]) {
    assert.equal((await get(u)).status, 404, u);
  }
});

test("a game cannot reach another folder or hidden files", async () => {
  for (const p of ["/../other/index.html", "/%2e%2e/other/index.html", "/..%2fother/index.html", "/.git/config", "/a\\b"]) {
    const r = await get("https://dave.start.ng" + p);
    assert.equal(r.status, 404, p);
  }
});

test("bad or multi-level host names are 404", async () => {
  for (const h of ["-bad.start.ng", "a.b.start.ng", "UP_per.start.ng"]) {
    assert.equal((await get(`https://${h}/`)).status, 404, h);
  }
});

test("reserved names are not served from the bucket", async () => {
  const bucketCalls = [];
  const spyEnv = { ...env, GAMES_BUCKET: { get: async (k) => (bucketCalls.push(k), null) } };
  const realFetch = globalThis.fetch;
  const forwarded = [];
  globalThis.fetch = async (req) => (forwarded.push(new URL(req.url).hostname), new Response("origin", { status: 200 }));
  try {
    for (const n of ["api", "auth", "login", "www", "3rdmainland"]) {
      const r = await worker.fetch(new Request(`https://${n}.start.ng/`), spyEnv);
      assert.equal(await r.text(), "origin", n);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.deepEqual(bucketCalls, []);
  assert.equal(forwarded.length, 5);
});

test("only GET and HEAD; HEAD has no body", async () => {
  assert.equal((await get("https://dave.start.ng/", { method: "POST" })).status, 405);
  const h = await get("https://dave.start.ng/", { method: "HEAD" });
  assert.equal(h.status, 200);
  assert.equal(await h.text(), "");
});

test("helpers", () => {
  assert.equal(gameNameFromHost("dave.start.ng", "start.ng"), "dave");
  assert.equal(gameNameFromHost("start.ng", "start.ng"), null);
  assert.equal(keyForPath("dave", "/"), "dave/index.html");
  assert.equal(keyForPath("dave", "/save"), "dave/save/index.html");
  assert.equal(keyForPath("dave", "/a/b.js"), "dave/a/b.js");
});

test("a hidden game shows the unavailable page on every path, and others are untouched", async () => {
  const hiddenEnv = { ...env, GAMES_BUCKET: fakeBucket({ ...files, "_hidden/dave": "" }) };
  for (const p of ["/", "/style.css", "/save/"]) {
    const r = await worker.fetch(new Request(`https://dave.start.ng${p}`), hiddenEnv);
    assert.equal(r.status, 410);
    assert.match(await r.text(), /isn't available/);
    assert.equal(r.headers.get("cache-control"), "no-store");
  }
  const other = await worker.fetch(new Request("https://other.start.ng/"), hiddenEnv);
  assert.equal(other.status, 200);
});

test("the hidden marker itself can't be fetched as a game", async () => {
  const hiddenEnv = { ...env, GAMES_BUCKET: fakeBucket({ ...files, "_hidden/dave": "" }) };
  const r = await worker.fetch(new Request("https://_hidden.start.ng/dave"), hiddenEnv);
  assert.equal(r.status, 404);
});
test("Range requests get part of the file (206), so iPhone Safari can play audio and video", async () => {
  const part = (range, init = {}) => get("https://dave.start.ng/song.mp3", { ...init, headers: { range, ...(init.headers || {}) } });
  for (const [range, body, contentRange] of [
    ["bytes=0-1", "01", "bytes 0-1/10"],
    ["bytes=4-", "456789", "bytes 4-9/10"],
    ["bytes=-3", "789", "bytes 7-9/10"],
    ["bytes=8-99", "89", "bytes 8-9/10"],
  ]) {
    const r = await part(range);
    assert.equal(r.status, 206, range);
    assert.equal(r.headers.get("content-range"), contentRange, range);
    assert.equal(r.headers.get("content-type"), "audio/mpeg");
    assert.equal(await r.text(), body, range);
  }
  const past = await part("bytes=10-");
  assert.equal(past.status, 416);
  assert.equal(past.headers.get("content-range"), "bytes */10");
  // Not a range we serve (several ranges, nonsense): the whole file, like before.
  for (const range of ["bytes=0-1,4-5", "items=0-1", "bytes=5-2"]) {
    const r = await part(range);
    assert.equal(r.status, 200, range);
    assert.equal(await r.text(), "0123456789", range);
  }
  // If-Range from an older version: the whole new file.
  const stale = await part("bytes=0-1", { headers: { "if-range": "\"old\"" } });
  assert.equal(stale.status, 200);
  assert.equal((await part("bytes=0-1", { headers: { "if-range": "\"abc\"" } })).status, 206);
  // HEAD keeps the status and headers, with no body; a missing file is still a 404.
  const head = await part("bytes=0-1", { method: "HEAD" });
  assert.equal(head.status, 206);
  assert.equal(await head.text(), "");
  assert.equal((await get("https://dave.start.ng/nope.mp3", { headers: { range: "bytes=0-1" } })).status, 404);
  // Every file says it can be asked for in parts.
  assert.equal((await get("https://dave.start.ng/")).headers.get("accept-ranges"), "bytes");
});

test("parseRange", () => {
  assert.deepEqual(parseRange("bytes=0-0", 1), { offset: 0, length: 1 });
  assert.deepEqual(parseRange("bytes=-20", 10), { offset: 0, length: 10 });
  assert.equal(parseRange("bytes=-0", 10), "unsatisfiable");
  assert.equal(parseRange("bytes=0-", 0), "unsatisfiable");
  assert.equal(parseRange("bytes=-", 10), null);
  assert.equal(parseRange(null, 10), null);
});
