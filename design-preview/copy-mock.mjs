// Part of `npm run build:design`: puts the sample data next to the built app (dist-design/mock). The Vercel rewrites in
// vercel.json answer the app's /api calls with these files. The list of independent games also becomes one file per game.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../dist-design/mock");
mkdirSync(resolve(out, "indie"), { recursive: true });
cpSync(resolve(here, "mock"), out, { recursive: true });
for (const game of JSON.parse(readFileSync(resolve(here, "mock/indie.json"), "utf8"))) {
  writeFileSync(resolve(out, "indie", `${game.id}.json`), JSON.stringify(game));
}
console.log("design-preview: sample data copied to dist-design/mock");
