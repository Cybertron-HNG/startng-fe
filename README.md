# startng-fe

React + Vite + TypeScript frontend for start.ng. Homepage with the games list, plus email/password and Google sign-in against startng-be.

To add a game to the homepage, add it to `src/games.ts` (it links to `https://<slug>.start.ng`).

`/explore` lists games that other people host on their own sites (`src/Explore.tsx`). Anyone can submit one there without signing in: the form checks each field as you go, and startng-be checks it all again. The homepage has a band that points to it. A game's creator gets a removal key once, and this browser keeps it so the creator can take the game down later.

```bash
cp .env.example .env   # set VITE_API_URL and VITE_GOOGLE_CLIENT_ID
npm install && npm run dev
```

## Deploy (Coolify)
Dockerfile build pack (nginx, port 80). VITE_API_URL and VITE_GOOGLE_CLIENT_ID are build-time, so mark them as
Build Variables in Coolify. GitHub secrets: COOLIFY_WEBHOOK_URL (optional COOLIFY_TOKEN); the
Deploy (Coolify) workflow runs only after Malware Scan (CI Gate) passes on main.

## Leaderboards for games (opt-in, game-defined)

A game gets a leaderboard by shipping a `startng.json` that lists its own stats (for example waves and kills,
or gems and time). The homepage shows a **Leaderboard** button only on games that have one, with that game's
columns. Games save runs and read the board through the API with a game session: after
`start.ng/?return_to=<game url>`, start.ng sends the player back with `#startng_session=...`.
See the builder documentation and the startng-be README.
