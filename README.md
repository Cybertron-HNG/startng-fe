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
   - **Boxes on start.ng's own pages:** `registerPagePart({ feature, key, page: "tournament", Component })`, shown
     where the page puts `<PageParts page="..." />` (with `user` and `onSignIn`).
3. Your API calls live in your folder too (`src/features/<feature>/api.ts`), using `call` and `send` from `src/api.ts`.
   Admin tabs and profile sections are wrapped in an error boundary, so a crash in yours doesn't take down the page.

## Majors: partner tournaments with prizes
`src/features/majors`; flag `majors` (startng-be `app/features/majors`).
- **start.ng/majors/<slug>**: a major's page. One card with the partner and its logo, the key facts (time left,
  players, games, prizes) and the way in; the prizes (with who holds each place right now, then the winners); the
  games with their top 3 and your own place; the standings with the prize places marked; about the partner with its
  button; and how it works. Entrants see how many of the games they've played and can show only the ones they haven't.
- **start.ng/majors**: every major, the one that's on first.
- A banner on the home and tournament pages while a major is on or coming up (`registerPagePart`).
- Admin tab **Majors** (permission `majors.manage`): start from a template or from any earlier major, save a draft,
  open its page to check it, publish it. See who entered, take a player out with a note, and once it ends, the
  winners with their emails. "Copy as JSON" gives a major as a template file.
- `nginx.conf` serves `index.html` at `/majors` and `/majors/<slug>`. The page isn't written by the server yet, so a
  shared link shows start.ng's general preview.

## Name filter (PRD H2)
`src/features/moderation`; flag `moderation`. Admin tab **Name filter** (permission `moderation.words`): try a name,
add blocked or allowed words, see names already on start.ng that fail, and the built-in lists. The filter itself runs
on the API; when it refuses a name, the form shows the API's message.

## Needs fixing (PRD H2)
`src/features/needs_fixing`; flag `needs_fixing`.
- Admin tab **Needs fixing**: mark a game with a note for its owner; games their owners say are fixed come first,
  then games waiting for the owner. Put back, send back, or change the note.
- Your games: the owner sees what's wrong and "tell us it's fixed".

## Duplicate finder (PRD H2)
`src/features/duplicates`; flag `duplicates`.
- Admin tab **Duplicates**: look-alike pairs side by side (older first) with why they match; hide as copy, delete
  (type DELETE to confirm), keep both; scan all games; put hidden copies back.
- Your games: "Hidden: looks like a copy", naming the original. Hidden games show a **Hidden** tag instead of Live.

## Email (PRD H1)
`src/features/email`; flag `email`.
- **start.ng/emails**: signed-in players switch topics on and off; visitors sign up and confirm by link. The confirm
  and unsubscribe links in emails land here (`?confirm=`, `?unsubscribe=&topic=`).
- Admin tab **Email** (permission `email.view`): subscribers by topic, the outbox by status, and "Send me a test email".
- An **Emails** section on your own profile, shown once the profile page shows sections.

## Game health (PRD H2)
`src/features/game_health`; flag `game_health`.
- Admin tab **Game health** (permission `games.health`): counts by status, failing and unhealthy games with what's
  wrong, "Check now" and "Check all again".
- Your games: a **Not loading** notice on an unhealthy game, with "check again".

## Tournament emails (PRD H1)
Part of `src/features/email`: the **Get the tournament by email** box on start.ng/tournament (a `registerPagePart`).
Visitors leave an address and confirm by link; signed-in players turn on tournament and results emails in one click.

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
