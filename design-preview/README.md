# Design-only start.ng (for a separate Vercel project)

A copy of the start.ng website for looking at the design, with no server behind it. It is separate from the real deployment
(Docker + nginx, see `Dockerfile` and `nginx.conf`): nothing here changes how start.ng is deployed.

What it is: the same React app, built with `npm run build:design`. It reads sample data from `design-preview/mock/` (a snapshot of
the public games, categories and independent creators, taken 26 Oct 2026) instead of the API, so it works anywhere, signs nobody in
and saves nothing. It also adds one small whimsical touch: a little character on the home screen that follows the mouse, looks at
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

## The character

- Follows the mouse with a little delay and looks at it. Click anywhere: it hops, throws a few sparkles and says a short word.
- It never takes a click (`pointer-events: none`) and never blocks a button.
- With "reduce motion" on, it stands still with no animation (it still says its word when you click).
- On a phone it stays in its corner beside the scroll-up button and reacts to a tap.
- To change the words, edit `LINES` in `src/features/mascot/Mascot.tsx`; the look is in `src/styles.css` under "the small character".
