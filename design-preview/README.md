# Design-only start.ng (for a separate Vercel project)

A copy of the start.ng website for looking at the design, with no server behind it. It is separate from the real deployment
(Docker + nginx, see `Dockerfile` and `nginx.conf`): nothing here changes how start.ng is deployed.

What it is: the same React app, built with `npm run build:design`. It reads sample data from `design-preview/mock/` (a snapshot of
the public games, categories and independent creators, taken 26 Oct 2026) instead of the API, so it works anywhere, signs nobody in
and saves nothing. It also adds one small whimsical touch: a little character on every page that follows the mouse, looks at
it and hops when you click (`src/features/mascot`). It is built only here, never in the real site.

## Set it up on Vercel (once)

1. On vercel.com choose **Add New… → Project** and import the `Cybertron-HNG/startng-fe` repository.
2. Name it something like `startng-design`. Leave the settings as they are: `vercel.json` in the repo already sets the build command
   (`npm run build:design`), the output folder (`dist-design`) and the routes. No environment variables are needed.
3. Set the **Production Branch** to the branch you want to show (for example `dev`) and press **Deploy**.

Every push to that branch redeploys it. Other branches get their own preview links, which is handy for trying a design change.

## Try it on your computer

```bash
npm run build:design
npx serve dist-design   # or any static server; /api/* needs the rewrites in vercel.json, so Vercel is the real test
```

## What is and isn't in it

- In: the home page, all games, a game's page, independent creators and their pages, the category tiles, docs, light and dark, phone.
- Not in: anything that needs the server: signing in, scores, rooms, the admin, and the pages the server writes (the categories hub,
  a game's about / how-to-play / FAQ pages).
- To refresh the sample data, replace the files in `design-preview/mock/` with newer copies of the public `/games`, `/tags` and
  `/indie` answers.

## The character: a helper that moves around with you

A small lime guide on every page (except the Hangout, because that is a game: it stays out of games).

- **Moves with you.** It walks after the mouse and looks at it. On a phone it walks to where you tap or drag a finger. Click or tap: it hops and says a word. Double-click or double-tap: it dances ("Shaku shaku!"). Leave it alone for about 20 seconds: it falls asleep.
- **Gives tips**, one at a time, each once, at least 45 seconds apart: take a tour, today's tournament, new items in the shop, share start.ng on X, browse categories, creators. A tip goes away by itself after 15 seconds, and it waits while you type.
- **Gives a tour** of the home page (9 steps): it scrolls to each part, rings it, and says what it is. Back, Next, End the tour, Escape.
- **Welcomes you back.** Follow a link to a game (a `name.start.ng` address), come back to the tab after 15 seconds or more, and it dances and says "Welcome back! How was Bingo?" If the game said you won, it says "Hooray! You won Bingo. Welcome back!" and offers to share the win on X. Then it settles back in its corner.
- **Switch.** The small round button above the scroll-up button turns the guide off and on. The choice is kept in the browser.
- It never takes a click (only its card does), and with "reduce motion" on it stays in its corner without moving: tips, tour and cheer still work.
- Plain CSS animation and a little JavaScript: no canvas, no three.js.

How it knows you won: the game's `/connect` page is on start.ng, so it can set `localStorage` `startng-guide-won` to `{"game":"bingo","at":<milliseconds>}`, and the guide reads it when you come back. To see it here, run this in the browser's console before leaving and coming back:

```js
localStorage.setItem("startng-guide-won", JSON.stringify({ game: "bingo", at: Date.now() }));
```

A page of start.ng's own can ask for the cheer straight away: `window.dispatchEvent(new CustomEvent("startng:win", { detail: { game: "Bingo" } }))`.

The words are in `src/features/mascot/guide.ts` (tips, tour); the movement is in `src/features/mascot/Mascot.tsx`; the look is in `src/styles.css` under "the small character" and "the helper".
