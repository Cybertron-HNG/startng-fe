# startng-fe

React + Vite + TypeScript frontend for start.ng. Homepage with the games list, plus email/password and Google sign-in against startng-be.

To add a game to the homepage, add it to `src/games.ts` (it links to `https://<slug>.start.ng`).

```bash
cp .env.example .env   # set VITE_API_URL and VITE_GOOGLE_CLIENT_ID
npm install && npm run dev
```

## Building a feature (start here)
Every new feature lives in `src/features/<feature>/` with one owner (the PRD, section 3).
1. Copy `src/features/_template` and rename things, then add **one line** to `src/features/index.ts`
   (`import "./<feature>";`).
2. From your folder's `index.tsx`, register what you add (`src/features/registry.ts`). Everything you register is
   hidden while your flag is off (`GET /features` on the API; `useFeature("name")` in components).
   - **Pages:** `registerPage({ feature, path, shell: "app" | "bare", load: () => import("./Page") })`. `"app"` sits
     inside the start.ng shell (top bar, sign-in). A RegExp path's named groups become `params`. Also add the address
     to `nginx.conf` (one `location` line serving `index.html`).
   - **Game cards:** `registerCardPart({ feature, key, slot: "badges" | "stats" | "actions", render: (game) => ... })`.
     Return `null` to leave a card alone. Cards are `src/GameCard.tsx`; don't edit it for a feature.
   - **Admin tabs:** `registerAdminTab({ feature, key, label, permission, Component })`. You get `access`, `can`,
     `go` and the shared confirm dialog `ask`. Register the permission on the API side (`PERMISSIONS`).
   - **Your games:** `registerYourGamePart({ feature, key, Component })`, shown on each of the owner's games (with
     `game` and `reload`).
   - **Profile sections:** `registerProfileSection({ feature, key, title, Component })`. The profile page shows them
     with `<ProfileSections userId isMe />`.
3. Your API calls live in your folder too (`src/features/<feature>/api.ts`), using `call` and `send` from `src/api.ts`.
   Admin tabs and profile sections are wrapped in an error boundary, so a crash in yours doesn't take down the page.

## Deploy (Coolify)
Dockerfile build pack (nginx, port 80). VITE_API_URL and VITE_GOOGLE_CLIENT_ID are build-time, so mark them as
Build Variables in Coolify. GitHub secrets: COOLIFY_WEBHOOK_URL (optional COOLIFY_TOKEN); the
Deploy (Coolify) workflow runs only after Malware Scan (CI Gate) passes on main.

## Google Analytics
`src/analytics.ts` loads Google Analytics 4 (measurement ID `G-9K8146WXDG`, start.ng's web stream) on the live
site only: never in `npm run dev`, on localhost, or on `/connect` (games load it invisibly). Page views come
from GA itself; the app also records `view_item` (a game page), `play_game`, `share` (X or copy link),
`login`, `tournament_enter` and `publish_game`. Nothing to set in Coolify; a build variable
`VITE_GA_MEASUREMENT_ID` can change the ID, or `off` switches it off.

## Leaderboards for games (opt-in, game-defined)

A game gets a leaderboard by shipping a `startng.json` that lists its own stats (for example waves and kills,
or gems and time). The homepage shows a **Leaderboard** button only on games that have one, with that game's
columns. Games save runs and read the board through the API with a game session: after
`start.ng/?return_to=<game url>`, start.ng sends the player back with `#startng_session=...`.
See the builder documentation and the startng-be README.
