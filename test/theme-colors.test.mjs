import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

test("newsletter warning uses dark-mode-aware warning tokens", () => {
  const rule = css.match(/\.warn\s*\{([^}]*)\}/)?.[1];

  assert.ok(rule, "expected a .warn rule in src/styles.css");
  assert.match(rule, /background:\s*var\(--warn-bg\)/);
  assert.match(rule, /border:\s*1px solid var\(--warn-line\)/);
  assert.match(rule, /color:\s*var\(--warn-ink\)/);
  assert.doesNotMatch(rule, /#[0-9a-f]{3,8}\b/i);
});
