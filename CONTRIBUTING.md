# Contributing to start.ng

These rules are official. Every contributor, and every AI a contributor uses, follows them. A PR that breaks them is sent back, however well it works.

## Stick to the styling of the app

Every new page, component or feature must look like it already belongs on start.ng. **Do not step away from how the app looks.** Before you build anything, open the live site and the existing pages and look at how they are laid out, then match them.

- **Use the existing look.** Reuse the colours, fonts, spacing, cards, buttons, pop-ups and tables already in the app. Copy the pattern of the nearest existing page instead of inventing a new one.
- **Use the CSS variables in `src/styles.css`** (`--bg`, `--card`, `--ink`, `--muted`, `--line`, `--lime`, `--danger`, `--ok` and the rest). Do not hard-code hex colours in components or add a second palette.
- **Reuse existing components** (for example `GameCard`, `BoardTable`) before writing your own. If one almost fits, extend it rather than copying it.
- **Add new styles to `src/styles.css`** in the same style as what is there. Do not add a new CSS framework, UI library or font.
- **Dark mode must work.** Every colour has to come from a variable that has a dark value. Check both themes.
- **Phones must work.** Check your page at phone width (about 375px) with no sideways scrolling, except for tables that are meant to scroll.
- **Not sure?** Ask in the team chat and show a screenshot before you open the PR.

A feature that works but looks like a different app will be sent back.

## The rules in detail

### Never do these
1. **No hard-coded colours.** No `#hex`, `rgb()` or named colours in `.tsx` or in new CSS rules. Use a variable. If you truly need a new colour, add it as a variable in **both** `:root` and `:root[data-theme="dark"]` in `src/styles.css`, and say so in the PR.
2. **No new libraries for looks.** No Tailwind, shadcn, MUI, Chakra, Bootstrap, styled-components, emotion, icon packs or web fonts. The app is plain CSS in `src/styles.css`.
3. **No second font.** The body font is the Helvetica stack; the monospace variable `--mono` is for eyebrows, counts and code.
4. **No inline `style={{ }}` for colour, spacing or typography.** Use a class. (A few inline styles exist for values computed at run time, like a width from data. That is the only reason to add one.)
5. **No new page layout.** Pages sit in `.container` (max width 960px, 24px side padding).
6. **No new breakpoints.** The app uses `max-width: 760px` and `max-width: 600px` (and a few older ones). Use those.

### How things look here (copy these)
| Thing | How it is done | Where to look |
| --- | --- | --- |
| Page width | `.container` | `src/styles.css` |
| Hero heading | `.eyebrow` (mono, uppercase), big `h1`, `<mark>` for the lime highlight, `.lead` for the intro | Home in `src/App.tsx` |
| Section heading | `.section-head` with an `h2` and a mono `.count` | the games list in `src/App.tsx` |
| Buttons | `button` / `.btn` (solid), `.ghost` (outlined), `.link` (text). Radius 10px, bold | `src/styles.css` |
| Cards | `--card` background, 1px `--line` border, radius 18px, hover lifts with a lime offset shadow | `.game`, `.card` |
| Game card | `GameCard.tsx`; features add to it through `registerCardPart`, never by editing it | `src/GameCard.tsx` |
| Empty state | `.empty` (dashed border, muted text, a link out) | `src/styles.css` |
| Loading | `Skeleton.tsx` / `.skeleton` shimmer, `aria-busy` on the container | `src/Skeleton.tsx` |
| Not found | `NotFound.tsx` | `src/NotFound.tsx` |
| Tables | `BoardTable.tsx` | `src/BoardTable.tsx` |
| Paging and search | `Pagination.tsx`, `SearchBox.tsx` | `src/` |
| Dark / light | `data-theme` on `<html>`; every colour is a variable | top of `src/styles.css` |
| A new feature | `src/features/<feature>/`, one owner, one flag (see `README.md`) | `src/features/_template` |

### Accessibility and copy
- Real headings in order: one `h1` per page, then `h2`, `h3`. Do not skip levels for looks.
- Links and buttons have text or an `aria-label`. Pictures have `alt`.
- The current page link in the nav has `aria-current="page"`.
- Short, plain English. No jargon on the page. Say what a thing does.

## Pages that search engines read: Google and people see the same page

The same rules are in `startng-be`'s `CONTRIBUTING.md`. Some pages are written twice. The API writes them as plain HTML for Google, AI tools and link previews (`startng-be` `app/routers/pages.py`, put in place by `nginx.conf`), and then React draws the real page. Google compares the two. If what it is served differs from what people see, it treats that as cloaking and ranks the whole site lower, or drops it. So the two versions must match.

Today these pages are written by the API:

| Address | API route | React |
| --- | --- | --- |
| `/` | `GET /pages/home` | home view in `src/App.tsx`, text in `src/home-copy.ts` |
| `/games`, `/games?page=2` | `GET /pages/games` | games view in `src/App.tsx` |
| `/games/<name>` | `GET /pages/games/{name}` | `src/GamePage.tsx` |
| `/creators/<id>-<name>` | `GET /pages/creators/{id}` | `src/IndiePage.tsx` |
| `/by/<id>-<name>` | `GET /by/{id}/page` | `src/features/creator_hub/CreatorPage.tsx` |

### The content must match
1. **Nothing for Google only.** Every word, heading, link and number the API writes must be on the React page when it loads, with no sign-in and no clicks beyond opening a dropdown. No hidden text, no extra keywords, no text in a colour or size people can't read.
2. **Nothing missing either.** The main content people see (headings, the games listed, the About and questions) must be in the server version too.
3. **Same words.** Copy lives once in each repo and is kept identical: `src/home-copy.ts` and `HOME_ABOUT` / `HOME_QUESTIONS` in `pages.py`, and so on. Change one, change the other in the same pair of PRs.
4. **Same data, same order, same counts.** The server uses the same query as the API endpoint React reads (hidden games left out, same sort) and the same numbers: games per page, games on the homepage, games in the A to Z list. These constants carry a comment naming their twin (for example `PER_PAGE` in `pages.py` and in `src/App.tsx`). Change both.
5. **Same links.** The same addresses in the same places, as real `<a href>` links Google can follow, never a click handler only.
6. **Same structure.** One `h1` with the same text, the same heading levels and the same class names, so the server version also looks right while the app loads.
7. **Everyone gets the same page.** Never change what is served based on the user agent, bot detection or country.
8. **A page that doesn't exist is a 404** for both (an unknown game, a page of games past the last one): nginx serves the 404 page with a 404 status, and React shows `NotFound`. Never a copy of another page.

### The head must match
9. The title, description, canonical link, robots tag and preview image are the same in the served HTML (`src/seo.ts` at build time, or `pages.py`) and in what React sets with `setSeo()` as people move around.
10. **Each address is its own canonical**, including pages of a list (`/games?page=2`). Searches, filters, sign-in flows, invites and private pages are `noindex`, both in what is served (meta tag or `X-Robots-Tag` header) **and** in React.
11. **Structured data (JSON-LD) only describes what is on the page.** No ratings, prices or authors that people can't see.
12. **The sitemap lists only canonical, indexable addresses.** Never a `noindex` page.

### When the API can't answer
13. The page falls back to the plain app, with no error text and never a different page. nginx already does this (`@ssr_empty` and the shell fallbacks in `nginx.conf`); keep it that way.

### A new page that search engines should read
It needs all of these, in one pair of PRs: the route in `pages.py` with tests that check its text, a `location` in `nginx.conf`, a path in `src/main.tsx`, a title and description in `src/seo.ts`, an entry in the sitemap, and a row in the table above. Everything the API writes goes through `_esc()`. Never change a published address without a redirect.

### Check it before you open the PR
Run the API locally, build the frontend and serve it with nginx (the `Dockerfile`, with `SSR_UPSTREAM` set to your local API). Then compare the two versions of each page you touched:
```bash
curl -s http://localhost:8080/games
```
That is what Google is served. Open the same address in a browser and check that every heading, game, count and link in the curl output is on the page, in the same order, and that the title, canonical and robots tags in the page's `<head>` match. Say in the PR that you did this.

A PR that lets the two versions drift apart is sent back, even if both look fine on their own.

## Before you open a pull request

1. Branch from `dev` and keep the PR to one feature.
2. Run `npx tsc --noEmit` and `npm run build`. CI runs both.
3. Look at your change in light mode, dark mode and at phone width. Put a screenshot in the PR.
4. Fill in the checklist in the PR template.
5. Quick self-check for stray colours in your change:
   ```bash
   git diff origin/dev -U0 -- 'src/*.tsx' 'src/**/*.tsx' | grep -E '^\+.*#[0-9a-fA-F]{3,8}\b'
   ```
   It should print nothing.

## What CI checks

- **CI** (`ci.yml`): typecheck, build, worker tests, dependency audit.
- **CodeQL**: security scan.
- **Malware Scan (CI Gate)**: blocks known malicious code patterns.
- **CodeRabbit**: automatic review. It also flags changes that break the styling rules above.

CI cannot judge how a page looks, so the reviewer and the PR checklist hold that line.

## If you use an AI

Give it this file and `AGENTS.md` first. Ask it to read `src/styles.css` and the nearest existing page before it writes any UI. Check what it gives you against the rules above before you open the PR. The PR is yours, not the AI's.
