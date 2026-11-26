# start.ng game host (Phase 1)

One Cloudflare Worker serves every game from one R2 bucket.
`dave.start.ng` shows the files in the `dave/` folder. No API, login or database.

## Plan

1. Create an R2 bucket (`startng-games`).
2. Add one proxied wildcard DNS record `*.start.ng`.
3. Deploy this Worker with the bucket bound and the route `*.start.ng/*`.
4. Upload `sample-game/dave/` to the bucket as the folder `dave/`.
5. Open `https://dave.start.ng` and run the checks below.
6. Deploy the new homepage (separate PR in this repo).

Steps 1 to 5 were done by Sadiq on 2026-10-15 and the new homepage is live, so Phase 1 is done.

## Cloudflare setup

### 1. R2 bucket
Cloudflare dashboard > R2 > Create bucket. Name it, and put that name in `wrangler.toml`
under `bucket_name`. Keep it private (do not turn on public access or a custom domain for it).
The Worker reads it through the binding, so no S3 keys are needed.

### 2. Wildcard DNS record
Dashboard > the `start.ng` zone > DNS > Add record:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| `AAAA` | `*` | `100::` | Proxied (orange cloud) |

`100::` is a dummy address. The Worker answers the request, so nothing is contacted.
It must be proxied or the Worker never runs.
Existing specific records (`api`, `www`, `3rdmainland`) keep working: a specific record
always beats the wildcard. Do not delete them.

### 3. Deploy the Worker, binding and route
From this folder:

```
npm i -g wrangler        # once
wrangler login
wrangler deploy
```

`wrangler.toml` sets the route `*.start.ng/*` and the binding `GAMES_BUCKET`.
(Dashboard way: Workers > Create > paste `src/index.js` > Settings > Bindings > add R2 bucket
with variable name `GAMES_BUCKET` > Triggers > add route `*.start.ng/*` on zone `start.ng`.
Also add the variables `BASE_DOMAIN` and `RESERVED_NAMES` from `wrangler.toml`.)

### 4. Upload the sample game
```
cd sample-game
for f in $(find dave -type f); do
  wrangler r2 object put "startng-games/$f" --file "$f" --remote
done
```
(or drag the `dave` folder into the bucket in the dashboard).

## Run it locally (no Cloudflare needed)

`dev-server.js` runs the real Worker code against a folder on your computer instead of R2.
Each folder is a game: `sample-game/dave/index.html` is `dave`.

```
cd worker
npm run dev
```

- `http://localhost:8787` lists the games it finds.
- `http://dave.localhost:8787` opens the `dave` game. Chrome and Firefox resolve `*.localhost` by themselves.
- Use your own games folder: `GAMES_DIR=/path/to/games npm run dev` (add `PORT=3000` to change the port).
- Reserved names (`api.localhost`, `www.localhost`, ...) answer 404, since there is no backend locally.
- Files are never cached, so refresh the page after you edit a game.
- If your browser will not open `*.localhost`, add the name to your hosts file, e.g. `127.0.0.1 dave.localhost`.

## Publish a game from a GitHub repo

`scripts/publish-game.js` downloads a repo, finds the built game and publishes it as `<name>.start.ng`.

```
npm run publish-game -- https://github.com/<owner>/<repo>                  # into ./local-games, for dev-server.js
npm run publish-game -- https://github.com/<owner>/<repo> --name my-game   # pick the subdomain
npm run publish-game -- https://github.com/<owner>/<repo> --target r2      # upload to the R2 bucket (needs wrangler login)
```

- It looks for a ready-to-run `index.html` in `dist/`, `build/`, `docs/`, `out/` or the repo root. A source `index.html` that loads `/src/*.ts` doesn't count.
- No built game: it stops and says so. Ask the owner to commit their built files. `--build` runs `npm install` and `npm run build` instead, which runs the repo's own code: only use it for repos you trust.
- It skips hidden files and `node_modules`, refuses reserved names, and limits a game to 2000 files and 100 MB (25 MB per file).
- To try the local copy: `GAMES_DIR=./local-games npm run dev`, then open `http://<name>.localhost:8787`.
- `--target r2` is untested until the bucket exists. Files an older version had and the new one dropped stay in the bucket.

## Test

Locally, no Cloudflare needed: `npm test` (fake bucket; Worker and publish-script tests).

Live:
```
curl -i https://dave.start.ng/            # 200, text/html
curl -i https://dave.start.ng/save        # 200, the save page
curl -i https://dave.start.ng/style.css   # 200, text/css
curl -i https://dave.start.ng/game.js     # 200, text/javascript
curl -i -H "Range: bytes=0-9" https://dave.start.ng/   # 206, Content-Range: bytes 0-9/<size>
curl -i https://nope.start.ng/            # 404
curl -i https://api.start.ng/health       # still the backend, not the bucket
```
Then open `https://dave.start.ng` in a browser: the page should say "It works".

## Rules in the code
- Host `<name>.start.ng` maps to folder `<name>/`. Names: lowercase letters, digits, hyphens.
- `/` gives `<name>/index.html`. `/save` and `/save/` give `<name>/save/index.html`.
  A last segment with a dot (`/style.css`) is a file.
- `..`, backslashes and hidden files (`.git`, `.env`) give 404.
- A game start.ng's admins hid has an empty `_hidden/<name>` object in the bucket (written by startng-be). Every
  path of that game then gets a 410 "This game isn't available" page (`no-store`). `SITE_URL` sets where its link goes
  (default `https://<BASE_DOMAIN>`). The check is one `head()` per request.
- Missing folder or file gives 404. Only GET and HEAD are allowed.
- A `Range` request (audio and video; iPhone Safari needs it) gets `206` with `Content-Range`, or `416` past the end. Several
  ranges or a malformed one get the whole file. `If-Range` with an older etag gets the whole new file. Every file sends
  `Accept-Ranges: bytes`. A Range request costs one `head()` more (for the size).
- Names in `RESERVED_NAMES` are passed on to the normal origin, never read from the bucket.

## Phase 1 done checklist
- [x] R2 bucket exists, private, name set in `wrangler.toml`
- [x] `*.start.ng` DNS record exists and is proxied
- [x] Worker deployed with route `*.start.ng/*` and binding `GAMES_BUCKET`
- [x] `dave/` uploaded; `https://dave.start.ng` plays/loads the sample game
- [x] `/save`, `/style.css`, `/game.js` load; unknown name gives 404
- [x] `api.start.ng`, `www`, `3rdmainland`, `start.ng` still work as before
- [x] New homepage merged and deployed

## Open questions
1. Final reserved names and the bucket exclusion list (the code uses api, auth, login, www, 3rdmainland).
2. Folder naming rules: the code uses lowercase letters, digits and hyphens. Length limit?
3. Nested pages: `/save` serves the page without redirecting to `/save/`, so relative links inside it
   may break. Games should use absolute paths (`/style.css`). Redirect instead?
4. Cache time (`CACHE_CONTROL`, now 60 seconds) after a game is updated.
