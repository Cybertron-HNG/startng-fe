import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { keyForPath, gameNameFromHost, etagMatches } from "../src/index.js";

// Fake bucket: a plain object of key -> content.
function fakeBucket(files) {
  return {
    async get(key) {
      if (!Object.hasOwn(files, key)) return null;
      return { body: files[key], httpEtag: '"abc"', httpMetadata: {} };
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
test("a file the browser already has gets a 304 with no body", async () => {
  let reads = 0;
  const bucket = fakeBucket(files);
  const counting = { ...bucket, head: async (key) => { const o = await bucket.get(key); return o && { httpEtag: o.httpEtag } }, get: (key) => { reads++; return bucket.get(key); } };
  const ask = (path, headers) => worker.fetch(new Request("https://dave.start.ng" + path, { headers }), { ...env, GAMES_BUCKET: counting });
  for (const inm of ["\"abc\"", "W/\"abc\"", "\"old\", \"abc\"", "*"]) {
    const r = await ask("/game.js", { "if-none-match": inm });
    assert.equal(r.status, 304, inm);
    assert.equal(await r.text(), "", inm);
    assert.equal(r.headers.get("etag"), "\"abc\"");
    assert.equal(r.headers.get("cache-control"), "public, max-age=60");
  }
  assert.equal(reads, 0, "a 304 reads no file");
  // A new version (another etag): the whole file, as before.
  const fresh = await ask("/game.js", { "if-none-match": "\"old\"" });
  assert.equal(fresh.status, 200);
  assert.equal(await fresh.text(), "1");
  assert.equal((await ask("/nope.js", { "if-none-match": "\"abc\"" })).status, 404);
  // Without If-None-Match nothing changes: one read and a 200.
  reads = 0;
  assert.equal((await ask("/game.js", {})).status, 200);
  assert.equal(reads, 1);
});

test("etagMatches", () => {
  assert.equal(etagMatches("\"a\"", "\"a\""), true);
  assert.equal(etagMatches("W/\"a\"", "\"a\""), true);
  assert.equal(etagMatches("\"b\" , \"a\"", "W/\"a\""), true);
  assert.equal(etagMatches("\"b\"", "\"a\""), false);
});
