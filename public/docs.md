# Build a game for start.ng

start.ng is a home for small browser games made by the community. Every game lives at its own address, like `yourgame.start.ng`, and every signed-in player brings their own start.ng character into every game.

This page is everything you need to build a start.ng game and put it live, by hand or with your AI. If you're using an AI, give it this page as plain text: **https://start.ng/docs.md**.

> **For AI assistants:** follow this page exactly. Build a static game, push it to a public GitHub repo, call `POST https://api.start.ng/games/check` and fix anything it reports, then call `POST https://api.start.ng/games/publish`, and show the human the `approve_url` from the reply if there is one. Everything you need is below.

## How it works

Your game is **frontend only**: HTML, CSS and JavaScript running in the player's browser. You don't need a server or a database, and you never handle passwords.

**start.ng is your backend.** It gives every game:

- **Players:** sign-in, a name and a character that looks the same in every game
- **A shared leaderboard,** with the columns you choose
- **Multiplayer rooms,** for games where players see each other live
- **Hosting** at `<name>.start.ng`, kept up to date with your GitHub repo

Your game talks to start.ng in one of two ways. Use whichever suits you; they share the same accounts and leaderboards.

| | The connect page | The HTTP API |
| --- | --- | --- |
| How | `postMessage` to a hidden `https://start.ng/connect` frame | `fetch` to `https://api.start.ng` with a **game session** |
| Sign-in | Already signed in on start.ng? Your game knows straight away | The player goes to start.ng once and comes back with a session |
| Gives you | The player and their face picture, scores, leaderboard, multiplayer tickets | The player, scores, leaderboard |
| See | [Talk to start.ng](#talk-to-start-ng) | [The HTTP API: game sessions](#the-http-api-game-sessions) |

Your game's name is its address: `relic-hunter.start.ng` is the game `relic-hunter`.

## What a start.ng game is

- **A static website:** HTML, CSS, JavaScript, images, sounds and fonts. It runs entirely in the browser; there's no server code.
- **In a public GitHub repo,** with a ready-to-play `index.html` either at the top of the repo or in `dist/`, `build/`, `docs/` or `out/` (start.ng looks in that order).
- **Already built.** start.ng never runs your code or installs packages (no `npm install`, no `npm run build`). If you use Vite, React or similar, build it and commit the built folder (for example `dist/`). A source `index.html` that loads `/src/main.ts` is refused with "needs building first".
- **No secrets.** Everything in your game is public. Never put API keys or passwords in it.
- **Any game engine works,** as long as the result is static files: plain JavaScript, canvas, three.js, Phaser, PixiJS, Babylon.js and so on.

### Rules for the files

| Rule | Detail |
| --- | --- |
| Served file types | `html htm css js mjs json map txt svg png jpg jpeg gif webp avif ico woff woff2 ttf otf mp3 ogg wav mp4 webm wasm`. Other files are skipped (and listed in the reply) |
| Size | Up to 2,000 files and 100 MB in total, 25 MB per file |
| Left out | Hidden files and folders (`.git`, `.env`…), `node_modules`, links |
| Paths | Use **relative** paths (`./game.js`, `assets/hero.png`, not `/assets/hero.png`) so the game works anywhere |
| Extra pages | Link to them with a trailing slash: `help/`, not `help` |
| Safety | Files are checked against known malware patterns before they go live |

### The name and address

Your game plays at `<name>.start.ng`. The name comes from `name` in the publish request, or from the repo name if you leave it out. It's turned into lowercase letters, numbers and hyphens (`Tower Stack` becomes `tower-stack`), at most 40 characters. `api`, `auth`, `login`, `www` and `3rdmainland` can't be used. The first person to put a name live owns it.

## Put your game live

Games go live through the API: one request with your repo link. No key or account is needed, so it works the same by hand, from a script, or from your AI. The game goes live at `<name>.start.ng` and on the start.ng homepage.

You can also paste your repo link into **Your games** on your start.ng profile (where you change your character) and click **Upload**. That's also where you manage your games: see them, change their cover, or click **Remove** to take one down.

### With the API

```
POST https://api.start.ng/games/publish
Content-Type: application/json

{ "repo_url": "https://github.com/you/tower-stack", "name": "tower-stack" }
```

| Field | Required | Meaning |
| --- | --- | --- |
| `repo_url` | Yes | A **public** GitHub repo: `https://github.com/<owner>/<repo>`, optionally `/tree/<branch>` |
| `name` | No | The game's name and address. Defaults to the repo name |
| `branch` | No | Which branch to publish. Defaults to the repo's main branch |

What happens next depends on whether the repo is already live.

### A new game: approve it once

The first time you publish a repo, start.ng downloads it, checks it, and replies **202** with an approve link:

```json
{
  "status": "pending",
  "name": "tower-stack",
  "repo_url": "https://github.com/you/tower-stack",
  "approve_url": "https://start.ng/approve/7Q4K9XPA2M3b",
  "expires_at": "2026-11-14T10:00:00Z",
  "folder": "dist",
  "files": 14,
  "size_bytes": 812345,
  "skipped": ["README.md"],
  "message": "Checked and ready. Open https://start.ng/approve/7Q4K9XPA2M3b to sign in with start.ng and put it live on your account. ..."
}
```

**Open `approve_url`** (AI assistants: show it to the human and ask them to open it). It signs you in to start.ng, which creates your account if you're new, and asks "Put tower-stack live?". Say yes and it's live at `https://tower-stack.start.ng` on your account. That repo is now linked to your account for good.

- The link works **once** and lasts **30 days**. If it runs out, publish again for a new one.
- Problems with the game come back **before** the link, so you never approve something that doesn't work (see [Checks before anything goes live](#checks-before-anything-goes-live)).
- New games published without signing in are limited to 20 an hour per address.

Signed-in requests (`Authorization: Bearer <start.ng token>`, as the start.ng website sends) skip the approve step and go live on that account straight away.

### Then a quick review (new games only)

A new game may wait for a quick look from the start.ng team before it's listed. The reply then has `"hidden": "in_review"`, and you get an email. While it waits, the game is **not** on start.ng's lists, search or tournaments, but its address (`https://tower-stack.start.ng`) works, so you can keep testing it. You get an email when it's approved, or why it wasn't. If it wasn't, fix it and push to your repo: it goes back in the queue by itself. Once a game is approved, updates go live straight away. AI assistants: tell the human it's waiting for review, not that it's live.

### An approved game: publishing again updates it

Publishing a repo that's already live updates the game immediately, on its owner's account, with no link. The reply is **200**:

```json
{
  "name": "tower-stack",
  "url": "https://tower-stack.start.ng",
  "repo_url": "https://github.com/you/tower-stack",
  "created": false,
  "folder": "dist",
  "files": 15,
  "size_bytes": 830112,
  "skipped": []
}
```

A repo can only update the game it's linked to; asking for a different `name` gives **409**.

### Updates: just push

However you put your game live, **start.ng watches the branch it came from and updates the game by itself after every push**, usually within a minute or two (games that haven't changed in a while are checked less often, up to once an hour). So the everyday loop is: change the game, push to GitHub. Done.

If a push doesn't publish (say `index.html` went missing), the game stays as it was until a push that works. Calling publish again updates it right away.

**Pushed but not live yet?** The game's card in **Your games** shows when start.ng last checked your repo and which commit is live (for example "Repo checked 3 min ago · live: 07b08b1"). If GitHub's limit has paused checking, it says so and when checking resumes. A push goes live once start.ng has checked it and it passes. A game that start.ng has no record of yet is republished from its repo the first time it's checked.

**Want pushes live straight away?** Install the **start.ng GitHub App** on your game's repo (the link is on the game in **Your games**, once the app is set up). GitHub then tells start.ng about every push and the game updates within seconds. Without it, start.ng still checks your repo every few minutes, so nothing breaks if you don't install it.

### A cover picture

Your game's card on start.ng shows a cover picture. Put **`cover.png`** (or `cover.jpg` / `cover.webp`) next to your `index.html` or at the top of your repo: start.ng picks it up automatically.

- **16:10**, at least **640 × 400** (1600 × 1000 looks sharp). Cards crop to 16:10.
- PNG, JPEG or WebP, under 2 MB.
- Make it look like the game, with its title on it. AI assistants: generate one, save it as `cover.png` next to `index.html`, and publish.
- Or upload one from **Your games** on your start.ng profile; that one wins over the repo's.
- Without one, the card shows the first letter of the game's name.

## Game standards

Every game on start.ng meets three standards. They keep the experience the same across games and help players find their way around and bring friends in. A game that doesn't meet them is **not published** (and a push that no longer meets them doesn't go live: see "When an update doesn't pass" below).

1. **A way back to start.ng.** A visible link to `https://start.ng`.
2. **start.ng branding.** The name "start.ng" shown in the game, for example on the start screen or the end screen.
3. **Share your result on X.** When a round ends, a **Share** button that opens an X (Twitter) post with the player's result and a link to your game.

The Kit (see "The Kit" below) adds all three to your game. The smallest way to meet the first two by hand:

```html
<footer>Play more on <a href="https://start.ng">start.ng</a></footer>
```

And the share button:

```js
shareButton.onclick = () => {
  const text = `I scored ${score} on Lane Dash! Can you beat me?`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(url, '_blank', 'noopener');
};
```

For the link, use your game's start.ng page (`https://start.ng/games/<your-game>`) if you want people to land on its page with the leaderboard.

### Works on a small phone

Many players are on a small phone (about 320 to 375 pixels wide). Open your game at that size before you publish. This is advice, not a check, but a game that doesn't fit gets bad reviews fast.

- Add `<meta name="viewport" content="width=device-width, initial-scale=1">` to `index.html`. Without it a phone draws your game at desktop width.
- Keep the top bar short: score, lives and buttons on one or two rows, taking up no more than about a quarter of the screen. Put the rest in a menu, or hide small extras on narrow screens.
- Nothing cut off at the sides, and the page never scrolls sideways. Let rows of buttons wrap.
- Don't draw a title, a hint or a banner on top of the score or the buttons.
- Buttons and tap targets at least 44 pixels square.
- Don't make a "Sign in" button and a player name fight for room: shorten the name or let it shrink on narrow screens.

start.ng reads your game's files to check these, so it can tell the code is there, not that it's on screen. Please make them easy to see: players share more when the button is easy to find. `POST /games/check` reports anything missing (codes `missing_back_link`, `missing_branding`, `missing_share`), so run it before you publish.

## Checks before anything goes live

Every time a game is published or updated (through the API, or by a push), start.ng downloads the repo and checks it **before** anything goes live. It reports **every** problem at once, so you can fix them in one go.

- **Errors** stop the game going live: it doesn't meet the rules above, or something in it could harm players.
- **Warnings** don't stop it, but are worth fixing. They come back in `warnings` when a game goes live.

To check a repo without publishing anything, call `POST https://api.start.ng/games/check` with the same body as publish. It replies **200** if the game would go live (with any `warnings`), or **422** with every problem. AI assistants: check first, fix what it finds, then publish.

```json
{
  "ok": false,
  "detail": "src/game.js looks like a crypto miner (and 1 more problem)",
  "errors": [
    { "code": "crypto_miner", "message": "src/game.js looks like a crypto miner", "file": "src/game.js" },
    { "code": "password_field", "message": "index.html asks for a password. Games never do: start.ng handles sign-in (see the docs, Sign in)", "file": "index.html" }
  ],
  "warnings": [
    { "code": "no_cover", "message": "No cover.png next to index.html, so your card shows a letter. Add a 16:10 picture", "file": null }
  ]
}
```

Every refusal from publish and check has this shape: `detail` for people, and `errors` and `warnings`, each with a `code` for scripts and AI tools, a `message`, and the `file` when there is one.

### Error codes

| Status | Code | When | What to do |
| --- | --- | --- | --- |
| 400 | `bad_link` | The link isn't a GitHub repo link | Use `https://github.com/<owner>/<repo>` |
| 400 | `bad_branch`, `bad_name`, `reserved_name` | The branch or name can't be used | Fix `branch` or `name` |
| 409 | `name_taken` | Someone else has that name | Pick another `name` |
| 409 | `repo_linked` | This repo is live under another name, or on another account | Leave out `name` to update the linked game |
| 422 | `repo_not_found` | The repo or branch doesn't exist, or isn't public | Make the repo public, check the branch |
| 422 | `no_index` | No `index.html` at the top or in `dist/`, `build/`, `docs/`, `out/` | Commit a ready-to-play `index.html` |
| 422 | `needs_build` | The `index.html` is source code that needs building | Build it and commit the built folder |
| 422 | `file_too_big`, `game_too_big`, `too_many_files`, `repo_too_big` | Over the size rules | Make it smaller |
| 422 | `malware` | A file matches a known malware pattern | Remove the file, and check your packages |
| 422 | `crypto_miner` | A file looks like a crypto miner | Remove it |
| 422 | `obfuscated_code` | A file runs code hidden in an encoded string, or is obfuscated so it can't be checked | Publish the readable code (normal minified builds are fine) |
| 422 | `password_field` | The game asks for a password | Remove it: start.ng handles sign-in |
| 422 | `redirect` | A page sends players to another site as soon as it opens | Remove the redirect |
| 422 | `hidden_program` | A file is really a program (for example an `.exe` renamed to `.png`), or carries one as text | Remove it |
| 422 | `missing_back_link` | No link to `https://start.ng` in the game | Add a "Back to start.ng" link (see Game standards) |
| 422 | `missing_branding` | The name "start.ng" isn't written anywhere in the game | Show "start.ng" on the start or end screen |
| 422 | `missing_share` | No share-on-X link (`twitter.com/intent/tweet` or `x.com/intent/post`) | Add a Share button that opens one |
| 429 | `rate_limited` | Too many new games or checks from your address | Try again in an hour |
| 502 / 503 | `download_failed`, `upload_failed`, `not_set_up` | GitHub or start.ng had a hiccup | Try again later |

### Warning codes

| Code | When |
| --- | --- |
| `external_script` | A script comes from a site other than start.ng or a well-known CDN (jsDelivr, unpkg, cdnjs, esm.sh…). Whatever is there runs in your game, so copy it into your repo |
| `insecure_link` | Something loads over `http://`, which browsers block on https sites |
| `leaves_start_ng` | The game sends players to another site |
| `no_cover` | No `cover.png` next to `index.html` |
| `no_start_ng_player` | The game doesn't ask start.ng who's playing (see the character rule) |
| `thin_page` | start.ng found nothing to say about your game on its own page. Add a `description` and a `story` to `startng.json` (or a paragraph about the game in a README) so the page tells people what it is about |

### When an update doesn't pass

If a push has errors, the game **stays on its last good version** and players notice nothing. The owner sees why on the game's card in **Your games** on their profile ("Your latest push didn't go live"), with every problem listed. Fix them and push again; the note goes away once a push goes live. If GitHub has a hiccup, start.ng simply tries the same push again on its next check.

## The Kit: one line instead of the code below

Add this to your game's HTML and you get the start.ng parts without copying any code:

```html
<script src="https://start.ng/kit.js" defer></script>
```

It adds a "← start.ng" button (top left) and a small "Made on start.ng" badge (bottom right), and gives your game `window.startng`:

| Call | What it does |
|---|---|
| `startng.gameOver({ score, stats, title, onPlayAgain })` | Saves the run and shows the end-of-round card: the score, the player's rank, anything they unlocked, **Play again** and **Share on X**. Pass `stats` if your `startng.json` lists them, otherwise just `score`. Resolves to the save reply (see "Leaderboards"), or `null` if nothing was saved. |
| `startng.getPlayer()` | Who is playing: `{ user, guest }`, or `null` when start.ng didn't answer. |
| `startng.onPlayerChange(fn)` | Calls `fn` with the player whenever they sign in or out. |
| `startng.signIn()` | Sends the player to start.ng to sign in, then back to your game. |
| `startng.saveRun(stats)` | Saves a run without showing the card. |
| `startng.getLeaderboard(limit)` | The top players, for everyone. |
| `startng.share({ score })` | Opens an X post with the result and a link to your game. |

The back button, the badge and the card's **Share on X** button are the three game standards, so a game that loads the Kit and calls `startng.gameOver()` (or `startng.share()`) at the end of a round meets all three. If you turn the button or the badge off, add your own link back to https://start.ng or the start.ng name instead.

Options go on the script tag: `data-back="off"` (no back button), `data-badge="off"` (no badge) and `data-position="right"` (back button top right). The Kit also sends start.ng a ping every 30 seconds while the game is on screen, so creators will be able to see how long people play. It sends nothing else.

Once **Play here** is switched on, players can also play a game in a frame on its own start.ng page. There the Kit leaves out the back button and opens start.ng's sign-in on that page, and saved scores update the leaderboard under the game. So keep your game working inside a frame: don't send it to the top window or block framing.

The code below is the manual way, if you want full control. Games that already use it keep working.

## Players and their character

start.ng handles sign-in. Your game never sees passwords, emails or the player's start.ng sign-in. It either asks start.ng's connect page who's playing, or calls the API with a game session that only works for your game.

### Talk to start.ng

The connect page is a hidden page, `https://start.ng/connect`, that your game talks to with the browser's `postMessage`. It only answers games served from a `*.start.ng` address, which publishing does for you. Add this to your game once:

```js
// Talks to start.ng through its hidden connect page.
const START_NG = 'https://start.ng';
let frame;

function connectFrame() {
  frame ??= new Promise((resolve, reject) => {
    const el = document.createElement('iframe');
    el.src = `${START_NG}/connect`;
    el.hidden = true;
    el.onload = () => resolve(el);
    el.onerror = reject;
    document.body.append(el);
  });
  return frame;
}

// Sends a message and resolves to start.ng's reply, or null if it didn't answer.
async function askStartNg(message, replyType, timeoutMs = 5000) {
  const el = await connectFrame();
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    const done = (reply) => { clearTimeout(timer); removeEventListener('message', onMessage); resolve(reply); };
    const timer = setTimeout(() => done(null), timeoutMs);
    function onMessage(e) {
      if (e.origin !== START_NG || e.source !== el.contentWindow) return;
      if (e.data?.type === replyType && e.data.requestId === requestId) done(e.data);
    }
    addEventListener('message', onMessage);
    el.contentWindow.postMessage({ ...message, requestId }, START_NG);
  });
}
```

Always check `e.origin` like this: it's what makes the reply trustworthy.

### Who's playing

```js
const reply = await askStartNg({ type: 'startng:whoami' }, 'startng:user');
const player = reply?.user ?? reply?.guest; // signed in, or start.ng's guest
```

The reply:

```json
{
  "type": "startng:user",
  "user": {
    "id": 42,
    "name": "Runner Tee",
    "account": "Hamzat",
    "style": { "body": "female", "primaryColor": "#a55eea", "secondaryColor": "#0c6e5a", "skinColor": "#8d5524", "hairColor": "#17120f", "hair": "braids", "hat": "crown", "accessory": "earrings" },
    "face": "data:image/png;base64,iVBORw0KGgo..."
  },
  "guest": { "name": "Guest", "style": { "...": "start.ng's guest look" }, "face": "data:image/png;base64,..." }
}
```

| Field | Meaning |
| --- | --- |
| `user` | The signed-in player, or `null` for a guest |
| `user.id` | Their start.ng id |
| `user.name` | Their **character's** name: show this in your game |
| `user.account` | Their account name, for a small `@name` |
| `user.style` | How their character looks (below) |
| `user.face` | A picture of their character's face (PNG data URL), for a profile card |
| `guest` | start.ng's one guest look and face, so guests look the same in every game |

Ask again when the player comes back to your tab (`visibilitychange` and `focus`): they may have signed in or out on start.ng.

### Sign in

Send the player to start.ng with a link back to your game; it signs them in (and has them make a character if they're new) and sends them back:

```js
location.href = `https://start.ng/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
```

They come back with a game session in the address, `https://your-game.start.ng/#startng_session=eyJ...&expires_in=7200`. If you use the connect page you can ignore it (just ask `startng:whoami` again); if you use the HTTP API, keep it (next section).

The start.ng homepage asks signed-out players "sign in or play as a guest?" before opening a game. If they pick guest, your game opens with `?guest` in its address: skip your own sign-in question then.

### The HTTP API: game sessions

To call the API with `fetch`, your game needs a **game session**: a key start.ng gives your game after the player signs in. It only works for **your** game's player API, lasts **2 hours**, and is never the player's password or real sign-in.

Read it once when your game loads, keep it, and clean the address:

```js
const params = new URLSearchParams(location.hash.slice(1));
if (params.get('startng_session')) {
  sessionStorage.setItem('startng_session', params.get('startng_session'));
  history.replaceState(null, '', location.pathname + location.search); // remove it from the address bar
}
const session = sessionStorage.getItem('startng_session'); // null = not signed in
```

Send it as a header: `Authorization: Bearer <session>`. If it has expired, the API answers **401**: send the player through [Sign in](#sign-in) again.

Who is playing:

```
GET https://api.start.ng/games/{game}/player
Authorization: Bearer <session>
```

```json
{ "id": 7, "name": "Trini", "style": { "body": "female", "primaryColor": "#4b7bec", "secondaryColor": "#2b2f4a", "skinColor": "#8d5524", "hairColor": "#17120f", "hair": "braids", "hat": "none", "accessory": "backpack" } }
```

`style` is the player's start.ng character (`null` if they haven't made one). It never includes the email.

### The character rule

**Every start.ng game shows the player's start.ng character.** That's what makes start.ng one place instead of many separate games.

- **Your game has a player character:** draw it from `style`, so it looks like it does on start.ng. Your art style can differ (pixel art, low-poly…), but keep the body, colours, hair, hat and accessory recognisable.
- **Your game has no character** (cards, puzzles, quizzes, strategy…): show a **profile card** at the top of the screen: the `face` picture, the character `name`, and `@account`. Style it to fit your game.
- **Guests:** use `guest` (the default look, named "Guest"), and offer a sign-in button.

Working examples: [Lane Dash](https://github.com/Blackburn0/HNG-Game) (a runner that dresses as your character) and [the Hangout](https://github.com/Blackburn0/startng-hangout) (start.ng's 3D park, where your full character walks around).

### Character style fields

| Field | Values |
| --- | --- |
| `body` | `female`, `male` |
| `primaryColor` | The top, `#rrggbb` |
| `secondaryColor` | Trousers or skirt, `#rrggbb` |
| `skinColor` | `#rrggbb` |
| `hairColor` | `#rrggbb` |
| `hair` | `short`, `afro`, `braids`, `bun`, `ponytail`, `dreads`, `bald` |
| `hat` | `none`, `cap`, `beanie`, `tophat`, `crown` |
| `accessory` | `none`, `glasses`, `earrings`, `beard`, `scarf`, `backpack` |

Fall back to something sensible for any missing or unknown value: start.ng may add more options later.

### A profile card, for games without a character

```html
<div class="startng-card" id="player-card" hidden>
  <img id="player-face" alt="">
  <div>
    <b id="player-name"></b>
    <span id="player-account"></span>
  </div>
  <button id="player-sign-in" hidden>Sign in</button>
</div>

<style>
  .startng-card { position: fixed; top: 16px; left: 16px; display: flex; align-items: center; gap: 12px;
    padding: 8px 16px 8px 8px; border-radius: 999px; background: #292a23; color: #fffefa; font-family: sans-serif; }
  .startng-card img { width: 48px; height: 48px; border-radius: 50%; background: #d8fd71; }
  .startng-card b { display: block; font-size: 16px; }
  .startng-card span { font-size: 12px; opacity: .7; }
  .startng-card button { margin-left: 8px; border: 0; border-radius: 999px; padding: 6px 12px; background: #d8fd71; font-weight: 700; cursor: pointer; }
</style>

<script type="module">
  // askStartNg is the helper from "Talk to start.ng".
  const reply = await askStartNg({ type: 'startng:whoami' }, 'startng:user');
  const player = reply?.user ?? reply?.guest;
  if (player) {
    document.getElementById('player-face').src = player.face;
    document.getElementById('player-name').textContent = player.name;
    document.getElementById('player-account').textContent = reply.user?.account ? `@${reply.user.account}` : 'Not signed in';
    document.getElementById('player-sign-in').hidden = !!reply.user;
    document.getElementById('player-sign-in').onclick = () =>
      (location.href = `https://start.ng/?return_to=${encodeURIComponent(location.origin + location.pathname)}`);
    document.getElementById('player-card').hidden = false;
  }
</script>
```

## Leaderboards

**Leaderboards are optional.** Each game's board keeps every signed-in player's **best run**. There are two kinds:

- **A plain score:** send one whole number, `score`. Highest wins. Nothing to set up.
- **Your own columns:** waves and kills, gems and time, coins and distance, whatever fits your game. Describe them in `startng.json`.

A game that has never saved a score and has no `startng.json` has no leaderboard. Once it has one, its card on start.ng gets a **Leaderboard** button showing your columns.

### Your own columns: `startng.json`

Add a file called **`startng.json`** next to your `index.html` (or at the top of your repo):

```json
{
  "leaderboard": {
    "stats": [
      { "key": "waves", "label": "Waves survived", "order": "highest" },
      { "key": "kills", "label": "Enemies killed", "order": "highest" }
    ]
  }
}
```

| Field | Meaning |
| --- | --- |
| `key` | The name your game sends: lowercase letters, digits and `_`, starting with a letter, up to 24 characters |
| `label` | The column title players see, up to 30 characters |
| `order` | `"highest"` (default) or `"lowest"` wins, for example the fastest time |
| `format` | Optional: `"number"` (default) or `"time"` (send seconds, shown as `m:ss`) |

- **1 to 5 stats.** Players are ranked by the **first** stat; the next ones break ties, then whoever got there first.
- start.ng reads `startng.json` when the game is published (and on every update). If something's wrong in it, publishing tells you what to fix.

### Your game's page: `description`

Every game gets its own page on start.ng, at `start.ng/games/<your-game>`. It's the page that search engines and shared links show, and players land there before they open your game. Add a one-line **`description`** to `startng.json` and it's used there (plain text, up to 300 characters):

```json
{ "description": "Dodge the lava and climb as high as you can.", "leaderboard": { "stats": [ ... ] } }
```

Without one, start.ng writes a simple line from your game's name. A `startng.json` with only a `description` is fine: it doesn't give your game a leaderboard on its own.

Examples:

| Game | `stats` |
| --- | --- |
| Wave shooter | `waves` (highest), `kills` (highest) |
| Runner | `distance` "Km run" (highest), `coins` (highest) |
| Race or escape | `gems` (highest), `time` (lowest, `"format": "time"`) |

### Pick your game's categories: `categories` and `other_category`

start.ng sorts games into categories, so players can browse "Endless runners" or "Brainy games", and each category has its own page. **You choose yours.** Add `categories` to `startng.json`: a list of up to 5 from the table below. Use the code in the first column (the name as it is shown on start.ng works too).

```json
{ "categories": ["endless-runners", "nigerian-themed", "five-minute-fun"], "other_category": "Rhythm" }
```

- **None of them fit?** Write your own in `other_category` (plain text, up to 40 characters). It is not shown to players, but the start.ng team reads them and adds a new category when many games ask for the same thing. You can use `other_category` together with `categories`, or on its own.
- **A word that isn't in the list** in `categories` is refused when you publish, with the list to pick from, so a typo never goes live by accident.
- **If you leave it out,** start.ng guesses from your game's name and what it says about itself, and the guess can be wrong. Choosing is better.
- "Web games", "Browser games" and the other search words are on every game already. Don't add them.
- Publishing again with a different list changes your categories. A category the start.ng team has set for your game stays as they set it.

| Code | Name | Group |
| --- | --- | --- |
| `endless-runners` | Endless runners | How you play |
| `racing-and-driving` | Racing and driving | How you play |
| `shooting-and-action` | Shooting and action | How you play |
| `archery` | Archery | How you play |
| `platformers` | Platformers | How you play |
| `brainy-games` | Brainy games | How you play |
| `board-and-card` | Board and card | How you play |
| `catch-and-dodge` | Catch and dodge | How you play |
| `coin-collecting` | Coin collecting | How you play |
| `stack-and-timing` | Stack and timing | How you play |
| `survival` | Survival | How you play |
| `tower-defence-and-strategy` | Tower defence and strategy | How you play |
| `football-and-sports` | Football and sports | How you play |
| `simulation-and-management` | Simulation and management | How you play |
| `escape-games` | Escape games | How you play |
| `nigerian-themed` | Nigerian themed | Setting and theme |
| `african-themed` | African themed | Setting and theme |
| `lagos` | Lagos | Setting and theme |
| `markets-and-street-life` | Markets and street life | Setting and theme |
| `food-and-cooking` | Food and cooking | Setting and theme |
| `space-and-sci-fi` | Space and sci-fi | Setting and theme |
| `neon-and-cyberpunk` | Neon and cyberpunk | Setting and theme |
| `fantasy-and-magic` | Fantasy and magic | Setting and theme |
| `ancient-ruins-and-treasure` | Ancient ruins and treasure | Setting and theme |
| `horror-and-spooky` | Horror and spooky | Setting and theme |
| `mystery-and-detective` | Mystery and detective | Setting and theme |
| `cosy-and-relaxing` | Cosy and relaxing | Setting and theme |
| `educational` | Educational | Learn and grow |
| `maths-and-numbers` | Maths and numbers | Learn and grow |
| `words-and-reading` | Words and reading | Learn and grow |
| `coding-and-tech` | Coding and tech | Learn and grow |
| `money-and-careers` | Money and careers | Learn and grow |
| `with-friends` | With friends | Play together |
| `for-a-class-or-cohort` | For a class or a cohort | Play together |
| `two-player-classics` | Two-player classics | Play together |
| `five-minute-fun` | 5-minute fun | Play together |
| `3d-games` | 3D games | Look and feel |
| `retro-and-pixel` | Retro and pixel | Look and feel |
### If your game is hosted outside start.ng: pick categories on the form

Games by independent creators are listed with the **Submit your game** form on the Creators page. The form has a **Categories** field: pick up to 5 from the same list as above. If none fit, write your own in **Other**. Your categories show on your game's own page. Independent games are not listed on the category pages or the homepage. Leaving the field empty is fine.

### Pages about your game: `story`, `controls`, `howToPlay`, `features`, `walkthrough`

Your game's page is at `start.ng/games/<your-game>`. start.ng can also write up to four more pages about it, so more people can find it when they search for how to play it or what it is:

| Page | Address | It needs |
| --- | --- | --- |
| About | `start.ng/games/<your-game>/about` | a `description` or a `story` (or at least 2 `features`) |
| How to play | `start.ng/games/<your-game>/how-to-play` | `controls` or `howToPlay` |
| FAQ | `start.ng/games/<your-game>/faq` | a `description`, or `controls` or `howToPlay`, plus a leaderboard, categories or a way to play to answer with |
| Walkthrough | `start.ng/games/<your-game>/walkthrough` | a `walkthrough` of at least 3 steps or tips |

**What is on them.** The About page says what the game is about (your `description` and `story`, plus anything more your README and your game's own page say about it), the facts at a glance (who made it, since when, its categories, its leaderboard, its first control), your `features`, and how scoring works. The How to play page has the goal, your `controls` and `howToPlay` steps, how the leaderboard ranks players, and what to do before you start. Every page also shows, live: the top players right now, more games by you, and games like yours. **The more you write in `startng.json`, the more your game's pages say.**

**Where start.ng reads from.** When you publish or update, start.ng reads your game's `startng.json`, its README, and the messages and opening comments in your repo's source (only as text: nothing is run) and keeps a short summary to write your game's pages from. Lines your game shows, like "RUN! Escape the boulder" or "Climb the ledge and pull the lever", can appear on its About and How to play pages, so write them the way you want players to read them. Messages from libraries and from start.ng itself are left out.

The pages are written **only from what your game says about itself**. start.ng never guesses how your game plays. If your files don't say how to play, the game gets no "How to play" page. Add the words, and the page becomes possible.

Put them in `startng.json`, next to `description`:

```json
{
  "description": "Dodge the lava and climb as high as you can.",
  "story": "A small fire spirit runs from an erupting volcano.",
  "controls": ["Space or tap to jump", "Down arrow or swipe down to slide"],
  "howToPlay": ["Run and jump the gaps.", "Slide under the stone arches.", "Grab every crystal for a higher score."],
  "features": ["Endless levels", "A daily goal", "Your own start.ng character"],
  "walkthrough": ["Learn the first three gaps by heart.", "Slide early, not late.", "Save your crystals for the last ridge."]
}
```

| Key | What to write |
| --- | --- |
| `description` | One or two plain sentences about the game (up to 300 characters). It is also used on your game's page. |
| `story` | The idea or story behind the game, in a sentence or two (up to 600 characters). |
| `controls` | A list of short lines, one per control: keys, taps or gestures. |
| `howToPlay` | A list of steps in order, as you would tell a new player. |
| `features` | A list of the things that are in your game. |
| `walkthrough` | A list of tips or steps for getting through the game (at least 3). |

- Every list takes up to **12 lines**, each up to **240 characters**, as plain text. No HTML. A single string also works for `controls`.
- Names are **exact**: `howToPlay` with a capital P and T. Publishing does **not** check these keys (it ignores keys it doesn't know), so a typo won't stop you publishing, but it also won't produce a page.
- **No `startng.json`?** start.ng also reads your `README.md`. Headings it understands: "How to play" or "Controls" (a numbered list is the steps, bullets are the controls), "Features", "Story" or "About", and "Walkthrough", "Tips" or "Guide". The first paragraph is used as the description if you didn't write one. It also reads the description tag and any words under a "How to play" heading in your game's own `index.html`.
- Write true things. Pages go live by themselves once they pass an automatic check, and the start.ng team may change the words or take a page down.
- A game that says the same as another game gets one page, not two. A game that says very little gets no extra pages.
- Pushing an update doesn't publish a page by itself. start.ng makes the pages from time to time, and a page appears at its address once it has been approved.

### Save a run

Signed-in players only. Send **exactly** the stats in your `startng.json` (or a plain `score` if you don't have one), each a **whole number** from 0 to 1,000,000,000. Anything else is refused.

With the connect page:

```js
// With startng.json:
const saved = await askStartNg({ type: 'startng:score', stats: { waves: 5, kills: 10 } }, 'startng:scoreSaved');
// Or a plain score:
const saved = await askStartNg({ type: 'startng:score', score: 1240 }, 'startng:scoreSaved');
// { ok: true, result: { best: 5, improved: true, rank: 3, stats: { waves: 5, kills: 10 } } }
// or { ok: false, error: "Sign in to save your score" }
```

With the HTTP API:

```
POST https://api.start.ng/games/{game}/scores
Authorization: Bearer <session>
Content-Type: application/json

{ "stats": { "waves": 5, "kills": 10 } }
```

```json
{ "best": 5, "improved": true, "rank": 3, "stats": { "waves": 5, "kills": 10 } }
```

Only the player's **best run** is kept: `improved` tells you whether this one beat it, and `stats` is their best run. `best` is its first stat.

### Read the board

Works for everyone, guests included. `limit` is 1 to 50 (default 10).

```js
const board = await askStartNg({ type: 'startng:leaderboard', limit: 10 }, 'startng:leaderboardData');
// { ok: true, entries: [...] }
```

```
GET https://api.start.ng/games/{game}/leaderboard?limit=10
```

```json
[ { "rank": 1, "player_id": 7, "name": "Trini", "color": "#4b7bec", "score": 8, "stats": { "waves": 8, "kills": 2 } } ]
```

- Highlight the player's own row by comparing `player_id` with their `id`.
- start.ng works out which game a score belongs to from your game's address (or its session), so a game can only save its own scores.
- Guests can see the leaderboard but can't save. Invite them to sign in.

## Multiplayer

For games where players see each other live, like the Hangout. This uses the connect page.

1. Get a one-minute ticket: `askStartNg({ type: 'startng:ticket' }, 'startng:ticketData')` → `{ ok, ticket, url }` (signed-in players only).
2. Open a WebSocket to `url` with `?ticket=` and the ticket added (URL-encoded), within a minute.
3. Exchange JSON messages:

| Direction | Message |
| --- | --- |
| You send | `{ "type": "move", "x", "z", "ry", "moving" }` (up to about 25 a second), `{ "type": "wave" }` (once a second at most) |
| You get first | `{ "type": "welcome", "you", "players": [...], "seats": [...] }` |
| You get after | `join`, `move`, `wave` and `leave` from everyone else |

Players are `{ id, name, style, seat, x, z, ry, moving }`, with names and looks from start.ng, so nobody can pretend to be someone else. Positions stay within ±60 metres. If the connection closes with code `4401`, the player needs to sign in; `4403`, the room is full; `4409`, they joined from another tab. Up to 50 players share a room. See [the Hangout](https://github.com/Blackburn0/startng-hangout) for a full example.

### Rooms: two-player and group games (start.ng referees)

For games where players take turns or play together in a room, like tic-tac-toe or chess, start.ng can run the rules on its server, so nobody can cheat and a player who drops can come back. This is for games start.ng builds and referees itself. For your own multiplayer game, use Relay rooms (next section); for an open world like the Hangout, use the first part of this section.

With the Kit loaded (`<script src="https://start.ng/kit.js" defer></script>`):

```js
const room = await startng.rooms.create();         // a room with a code to share
// const room = await startng.rooms.join('K7M2QX'); // a friend's room
// const room = await startng.rooms.quickMatch();   // find someone to play

room.on('state', ({ state, turn, result }) => draw(state));  // after every move
room.send({ cell: 4 });                                      // your move (the shape depends on the game)
room.inviteUrl();                                            // https://your-game.start.ng/?room=K7M2QX
```

- Players must be signed in with start.ng. If they are not, opening a room fails with an error whose message is `signin`; call `startng.signIn()`, which brings them back to the same address, `?room=CODE` included.
- Events on `room.on(...)`: `welcome`, `state`, `join`, `away` (a player dropped: they have 10 minutes to come back), `back`, `waiting`, `no_match` (offer a bot), `setup_ok`, `rematch`, `error`, `closed`, `reconnecting`. The kit reconnects by itself after a dropped connection.
- `room.resign()`, `room.playBot()` (play against start.ng's bot) and `room.leave()`.
- **Play again:** after a game ends, `room.rematch()` asks to play again in the same room. Each `rematch` event lists the seats that have asked (`room.rematchAsked`), so show the others "Dave wants a rematch". Once every person in the room has asked (a bot always agrees), a new `welcome` starts the game with the seats moved round by one, so someone else goes first: read `room.you` again. In a game with a host, only the host asks, and the room waits for them to start it again. A finished room closes after 5 minutes. `startng.rooms.online()` says how many people are in the game's rooms, and `startng.rooms.codeFromUrl()` reads `?room=CODE`.
- A room waits 15 minutes for a friend, and matchmaking 60 seconds. A room closes after 30 minutes without a move or 10 minutes with nobody in it. Messages are limited to 2 KB and 30 a second.
- The first refereed game is tic-tac-toe (`startng-tictactoe`).

**Games with a host (a quiz, bingo).** The person who makes the room is the host (seat 0, `room.host === 0`) and sets the game up; everyone else joins with the code (up to 100 players). Matchmaking and bots are not used.

```js
const room = await startng.rooms.create();
room.setup({ title: 'Capitals', questions: [{ q: 'Capital of Nigeria?', answers: ['Lagos', 'Abuja'], correct: 1 }] }); // wait for the 'setup_ok' event
room.start();                                  // the host starts it once people have joined
room.send({ answer: 1 });                      // a player's move (a host sends { skip: true })
room.serverNow();                              // the server's clock in ms: count down to state.deadline_ms against it
```

What `setup` takes is the game's own: the quiz takes questions (2 to 4 answers each, up to 50 questions); bingo takes `{ mode: 'numbers' | 'terms', terms, speed, pattern }`. A setup may be up to 64 KB. The server keeps score and checks every answer and claim; each player's state holds only what they may see.

### Relay rooms: your own multiplayer game

Relay rooms are for your own game. Players make or join a room with a code, and start.ng carries your messages between them. **start.ng does not know your rules**, so the game itself decides who won and what is allowed (there is no protection against a player who edits their copy of the game). It suits party games, co-op and casual games for 2 to 8 players.

```js
const room = await startng.rooms.create({ seats: 4 });   // or startng.rooms.join('K7M2QX'); invite link: room.inviteUrl()

room.on('message', ({ from, data }) => handle(from, data));   // from is the sender's seat
room.on('join', ({ player }) => {});  room.on('away', ({ seat }) => {});  room.on('back', ({ seat }) => {});
room.broadcast({ x: 3, y: 4, shot: true });                    // to everyone else
room.broadcast('psst', 2);                                     // to one seat

room.updateState((state) => ({ ...state, turn: 1 }));          // the shared state of the room (see below)
room.shared;                                                    // { version, data }: the latest shared state
room.on('room_state', ({ version, data, by }) => draw(data));
```

- **Seats and names.** `room.you` is your seat and `room.players` lists everyone (`{ seat, name, style, online }`) with names and looks from start.ng. The person who made the room is seat 0 (`room.host === 0`), so a game can let seat 0 decide when it begins. Up to 8 players; `seats` is how many this room is for (2 to 8, 4 if you leave it out). A full room says `4403`. There is no matchmaking for Relay rooms: players share the code or the link.
- **The shared state** is a small JSON value (up to 8 KB) the whole room keeps, and anyone who joins or comes back gets it in `room.shared`. It is for things everyone must agree on (whose turn, the board, scores), not for fast updates; send those with `broadcast`. A write says which version it started from, and if someone else wrote first it is refused; `updateState` handles that for you by running your function again on the newer state, so two players never overwrite each other. `room.setState(data)` is the low level call, and `state_conflict` is the event when it was refused.
- **A player who drops** keeps their seat for 10 minutes and the kit reconnects by itself; the others hear `away` and `back`. After a restart of start.ng, or when everyone has left for 10 minutes, the room closes (`closed`) and the game should offer a new one.
- **Limits.** A message is up to 2 KB and a player can send 30 a second, so do not stream a position every frame: 10 to 20 updates a second is plenty. Players must be signed in with start.ng. A player who joins from an invite link (`?room=CODE`) is taken through sign-in and back to the room. Delay is the time to start.ng and back, from tens to a few hundred milliseconds, so games built on quick reactions will feel it.
- A tic-tac-toe example that keeps its rules in the page, `startng-relay-template`, shows all of this in about 150 lines.

## Friends and follows

Players can follow each other on start.ng. Two players who follow each other are **friends**. This part of start.ng is switched on step by step: until it's on, these addresses answer 404.

- **Follow** anyone from their profile or creator page. Following twice changes nothing; unfollowing ends a friendship.
- **Invite links** (`https://start.ng/f/<code>`): whoever opens your link and accepts becomes your friend. A link works for 7 days and several people can use it. Get yours at [start.ng/follows](/follows).
- **Private by design:** other players see how many followers you have, never who they are, and never your email. There is no search for players. Up to 100 new follows a day.

These calls use the player's **start.ng sign-in** (the website's), not a game session, so games can't call them.

| Endpoint | Sign-in | What it does |
| --- | --- | --- |
| `PUT /follows/{user_id}` | start.ng | Follow a player |
| `DELETE /follows/{user_id}` | start.ng | Stop following |
| `GET /follows/{user_id}` | None | `{ user_id, followers, following, you_follow, friends }` (the last two are about you, and false when signed out) |
| `GET /me/friends`, `/me/following`, `/me/followers` | start.ng | Your own lists: `{ count, people: [{ id, name, character }] }` |
| `POST /friend-invites` | start.ng | Your invite link: `{ code, path, expires_at }` |
| `GET /friend-invites/{code}` | None | Who sent it: `{ inviter: { id, name, character }, expires_at }` |
| `POST /friend-invites/{code}/accept` | start.ng | Become friends with whoever sent it |

## API reference

Base URL: `https://api.start.ng`. Games on `*.start.ng` can call it straight from the browser.

| Endpoint | Sign-in | What it does |
| --- | --- | --- |
| `POST /games/publish` | None (or a start.ng sign-in) | Put a game live or update it. See [With the API](#with-the-api) |
| `POST /games/check` | None | Every check publishing does, without publishing. See [Checks before anything goes live](#checks-before-anything-goes-live) |
| `GET /games/publish/{code}` | None | What's waiting at an approve link |
| `GET /games` | None | Every live game: `[{ name, url, repo_url, by, updated_at, cover_url, leaderboard }]`. `leaderboard` is its columns, or `null` |
| `GET /games/{game}/player` | Game session | Who's playing: `{ id, name, style }` |
| `POST /games/{game}/scores` | Game session | Save a run: `{ "stats": {...} }` or `{ "score": n }` |
| `GET /games/{game}/leaderboard?limit=10` | None | The top players |
| `DELETE /games/{game}/scores/{player_id}` | The owner's start.ng sign-in | Remove a bad score |

| Status | Meaning |
| --- | --- |
| 401 | No session, it expired, or it's for another game: sign the player in again |
| 404 | No game with that name |
| 422 | A bad run: a stat missing or extra, not a whole number, below 0 or too big |

## Full example

A game using the HTTP API: a sign-in link, saving a run, and showing the board. It also meets the game standards (a link back, the start.ng name, and a Share button).

```html
<a id="signin" hidden>Sign in with start.ng to save your score</a>
<p id="message"></p>
<ol id="board"></ol>
<button id="share" type="button" hidden>Share on X</button>
<footer>Play more on <a href="https://start.ng">start.ng</a></footer>

<script type="module">
  const API = 'https://api.start.ng';
  const GAME = location.hostname.split('.')[0]; // "relic-hunter" on relic-hunter.start.ng

  // pick up the session after sign-in
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.get('startng_session')) {
    sessionStorage.setItem('startng_session', params.get('startng_session'));
    history.replaceState(null, '', location.pathname + location.search);
  }
  const session = sessionStorage.getItem('startng_session');
  const signin = document.getElementById('signin');
  signin.href = `https://start.ng/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
  signin.hidden = !!session;

  // call this when a round ends, with your startng.json stats, e.g. roundOver({ waves: 5, kills: 10 })
  window.roundOver = async (stats) => {
    if (session) {
      const res = await fetch(`${API}/games/${GAME}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session}` },
        body: JSON.stringify({ stats }),
      });
      const message = document.getElementById('message');
      if (res.ok) {
        const saved = await res.json();
        message.textContent = saved.improved ? `New best! You're #${saved.rank}` : `Not your best this time (#${saved.rank})`;
      } else if (res.status === 401) {
        sessionStorage.removeItem('startng_session');
        signin.hidden = false;
      }
    }
    // the share standard: a button that opens an X post with the result and a link to the game
    const share = document.getElementById('share');
    share.hidden = false;
    share.onclick = () => {
      const text = `I got ${stats.waves} waves on ${GAME}! Can you beat me?`;
      const post = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(`https://start.ng/games/${GAME}`)}`;
      window.open(post, '_blank', 'noopener');
    };
    const top = await fetch(`${API}/games/${GAME}/leaderboard?limit=10`).then((r) => r.json());
    const board = document.getElementById('board');
    board.replaceChildren(...top.map((e) => {
      const li = document.createElement('li');
      li.textContent = `#${e.rank} ${e.name}: ${e.stats.waves} waves, ${e.stats.kills} kills`;
      return li;
    }));
  };
</script>
```

## Share links and cards

When players share something from start.ng itself (a tournament result, and soon challenges, unlocks and league moves), the link looks like `https://start.ng/s/<kind>/<id>`. Pasted into X, WhatsApp or any chat, it shows a card with the result: the player's name, their place or score, and a "Play at start.ng" button. Opening the link takes people to the page it's about. This is being switched on in stages, so you may not see these links yet.

For your own game:

- Keep your Share-on-X button (it's one of the game standards) pointing at your game's page, `https://start.ng/games/<your-game>`. That link already shows your `cover.png` as its preview.
- To read a card yourself: `GET /share/{kind}/{id}` (public, no sign-in) returns `{url, text, image_url, square_image_url, title, path}`. `image_url` is 1200x630 (X and link previews); `square_image_url` is 1080x1080 (WhatsApp and Instagram).

## Good to know

- **Shared vs personal:** `localStorage` only lives in one browser, so other players never see what's in it. A personal best can live there, but anything other players should see must go to start.ng.
- **Cheating:** a browser game can never be fully cheat-proof. start.ng only accepts your declared numbers, within limits, from signed-in players. As the owner you can remove a bad score: `DELETE /games/{game}/scores/{player_id}` with your start.ng sign-in.
- **Testing:** sign-in, scores and multiplayer only work once your game is live at `your-game.start.ng`. Opened as a local file there's no player, so make sure your game still plays without one.
- **Privacy:** your game never sees the player's email or real sign-in. A game session only works for your game.

## Checklist before you publish

1. A built `index.html` is committed, at the top of the repo or in `dist/`, `build/`, `docs/` or `out/`, and runs without a build step.
2. Paths are relative, every file type you need is on the served list, and there are no secrets.
3. The game finds out who's playing (`startng:whoami`, checking `e.origin`; or `GET /games/{game}/player` with a session).
4. It shows the player's start.ng character, or a profile card if the game has no character.
5. Guests see the guest look and a way to sign in.
6. Want a leaderboard? A `startng.json` if you want your own columns, then save runs and read the board through start.ng.
7. It meets the game standards: a link back to `https://start.ng`, the start.ng name shown, and a Share-on-X button when a round ends.
8. There's a `cover.png` (16:10) next to `index.html`.
9. The repo is public on GitHub and pushed.
10. `POST /games/check` passes with no errors (and you've looked at the warnings).
11. Publish with the API and open the `approve_url` the first time. After that, pushing to the branch is enough.
12. Optional, but it helps people find you: your `categories` (and `other_category` if none fit), a `description`, and `controls` or `howToPlay` in `startng.json`, so your game can have its own about and how-to-play pages.
