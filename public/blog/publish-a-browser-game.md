# How to publish a browser game on start.ng

You made a game that runs in the browser. start.ng puts it live at its own address, `yourgame.start.ng`, gives it a leaderboard and a place on the homepage, and keeps it up to date every time you push to GitHub. You don't need a server, a database or an account to start.

## What a start.ng game is

A start.ng game is a **static website**: HTML, CSS, JavaScript, images, sounds and fonts, running entirely in the player's browser.

- It lives in a **public GitHub repo**, with a ready-to-play `index.html` at the top of the repo or in `dist/`, `build/`, `docs/` or `out/`.
- It is **already built.** start.ng never runs your code or installs packages. If you use Vite, React or similar, build it and commit the built folder.
- **Any engine works** as long as the result is static files: plain JavaScript, canvas, three.js, Phaser, PixiJS, Babylon.js.
- Use **relative paths** (`./game.js`, `assets/hero.png`) so the game works at its own address.
- Keep **no secrets** in it. Everything in a game is public.

## Put it live with one request

Send your repo link to the publish endpoint. No key is needed:

```
POST https://api.start.ng/games/publish
Content-Type: application/json

{ "repo_url": "https://github.com/you/tower-stack" }
```

The game's name, and so its address, comes from the repo name unless you send a `name`. `Tower Stack` becomes `tower-stack`.

start.ng downloads the repo and checks it before anything goes live. If something is wrong, like a missing `index.html` or a game that still needs building, the reply says what to fix.

## Approve it once

The first time you publish a repo, the reply has an **approve link**. Open it, sign in with start.ng (this creates your account if you are new), and say yes to "Put tower-stack live?". The game is live at `https://tower-stack.start.ng`, on your account, and the repo is linked to it for good.

A new game may then wait for a quick look from the start.ng team before it shows on the lists. Its address works the whole time, so you can keep testing.

## Updates: just push

From then on, start.ng **watches the branch the game came from** and updates the game after every push, usually within a minute or two. Change the game, push to GitHub, done.

Want pushes to go live within seconds? Install the start.ng GitHub App on the repo. The link is on your game in **Your games**.

## Make it look good on start.ng

- Add a **cover picture**: a `cover.png` (or `.jpg`, `.webp`) next to your `index.html`. It is the picture on your game's card and in link previews.
- Add a one-line **description** in a `startng.json` file next to your `index.html`. It is used on your game's page and in search results.
- Pick your **categories** in the same file, so players find your game when they browse.

## Next steps

- Add sign-in, scores and a share button with one line of code: see [the start.ng Kit](/blog/the-start-ng-kit).
- Everything above, in full, is in [the docs](/docs). Building with an AI assistant? Give it [start.ng/docs.md](/docs.md).
