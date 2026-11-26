import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the feature checklist uses theme-aware status colours", async () => {
  const css = await readFile(new URL("../src/features/discovery/discovery.css", import.meta.url), "utf8");

  assert.match(css, /\.feature-checklist \.ok\s*\{\s*color:\s*var\(--ok\);\s*\}/);
  assert.match(css, /\.feature-checklist \.todo\s*\{\s*color:\s*var\(--danger\);\s*\}/);
});
