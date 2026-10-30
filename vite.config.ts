import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AboutView from "./src/AboutView";
import { QUESTIONS } from "./src/home-copy";
import { Markdown, slug } from "./src/markdown";
import { SiteFooterView } from "./src/SiteFooterView";
import { DEFAULT_SITE_URL, headTags, jsonLd, PAGES, SITEMAP_PATHS, STATIC_PAGES } from "./src/seo";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** /docs as text inside #root: the same words and layout src/Docs.tsx draws from public/docs.md, so search engines
 *  and AI tools read the docs without running the app. The app replaces it when it loads. */
function docsText(site: string): string {
  const source = readFileSync(resolve(__dirname, "public/docs.md"), "utf8").replace(/\r\n/g, "\n");
  const toc = source.split("\n").filter((l) => l.startsWith("## ")).map((l) => l.slice(3))
    .map((s) => `<a href="#${slug(s)}">${esc(s.replace(/`/g, ""))}</a>`).join("");
  return (
    '<header class="container nav"><a class="logo" href="/"><b>start<span>.ng</span></b></a>' +
    '<nav aria-label="Pages"><a href="/games">Games</a><a href="/creators">Creators</a><a href="/docs" aria-current="page">Docs</a></nav></header>' +
    '<main class="container docs"><aside class="docs-side"><div class="ai-box"><b>Building with AI?</b><span>Give it this page as plain text:</span>' +
    `<code>${esc(`${site}/docs.md`.replace(/^https?:\/\//, ""))}</code>` +
    '<a class="btn ghost" href="/docs.md" download="startng-docs.md">Download as .md</a></div>' +
    (toc ? `<nav class="toc" aria-label="On this page"><p class="toc-title">On this page</p>${toc}</nav>` : "") +
    `</aside><article class="docs-body">${renderToStaticMarkup(createElement(Markdown, { source }))}</article></main>` +
    renderToStaticMarkup(createElement(SiteFooterView))
  );
}

/** /hangout as text inside #root: the page is a 3D park (src/hangout), so search engines get its heading, its description
 *  and its on-screen hint, in the same words (src/hangout/Hangout.tsx). The app replaces it when it loads. */
function hangoutText(): string {
  return (
    '<main class="container"><h1>The Hangout</h1>' +
    `<p>${esc(PAGES.hangout.description)}</p>` +
    "<p><b>WASD</b> or arrows to walk · <b>Shift</b> to run · <b>drag</b> to look · <b>Space</b> to wave · <b>Enter</b> to chat</p></main>"
  );
}

/** /404 as text inside #root: crawlers, curl, and visitors before React hydrates read the 404 heading and lead text. */
function notFoundText(): string {
  return (
    '<header class="container nav"><a class="logo" href="/"><b>start<span>.ng</span></b></a>' +
    '<nav aria-label="Pages"><a href="/games">Games</a><a href="/creators">Creators</a><a href="/docs">Docs</a></nav></header>' +
    '<main><section class="container hero"><p class="eyebrow">404</p><h1>Page not <mark>found.</mark></h1>' +
    '<p class="lead">There\'s nothing at this address.<br />Looking for a game? Each one lives at its own address, like <code>yourgame.start.ng</code>.</p>' +
    '<div class="actions"><a class="btn" href="/">Go to the homepage</a><a class="btn ghost" href="/games">Browse games</a></div></section></main>' +
    renderToStaticMarkup(createElement(SiteFooterView))
  );
}

// Link previews and search crawlers read the HTML they're served, so the build writes one HTML file
// per page (games.html, docs.html ...) with that page's title, description and Open Graph tags,
// plus robots.txt and sitemap.xml. nginx serves them (see nginx.conf). The tags come from src/seo.ts.
function seoPages(site: string): Plugin {
  const block = /<!--seo-->[\s\S]*?<!--\/seo-->/;
  const ROOT = '<div id="root"></div>';
  return {
    name: "startng-seo",
    apply: "build",
    // The homepage's own tags go into index.html.
    transformIndexHtml: { order: "post", handler: (html) => html.replace(block, `<!--seo-->\n    ${headTags(PAGES.home, site)}\n    ${jsonLd(site)}\n    <!--/seo-->`) },
    closeBundle() {
      const out = resolve(__dirname, "dist");
      const index = readFileSync(resolve(out, "index.html"), "utf8");
      for (const [file, page] of STATIC_PAGES) {
        writeFileSync(resolve(out, file), index.replace(block, `<!--seo-->\n    ${headTags(page, site)}\n    <!--/seo-->`).replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, ""));
      }
      // 404.html text inside #root: a crawler, curl, or browser before React hydrates reads the single <h1> heading.
      const notFoundHtml = readFileSync(resolve(out, "404.html"), "utf8");
      writeFileSync(resolve(out, "404.html"), notFoundHtml.replace(ROOT, `<div id="root">${notFoundText()}</div>`));
      // The homepage nginx serves: index.html with the API's text for search engines and AI tools included
      // inside #root (an SSI include, see "location = /" in nginx.conf). The app replaces it when it loads.
      if (!index.includes(ROOT)) throw new Error(`index.html has no ${ROOT} for the homepage text`);
      writeFileSync(resolve(out, "home.html"), index.replace(ROOT, `<div id="root"><!--# include virtual="/_ssr/home" --></div>`));
      // A page's file with its text inside #root and, for a page with more than one address, the address it adds to
      // its canonical and og:url (as SSI, so nginx fills it in).
      const fill = (file: string, path: string, root: string, more = "") => {
        const html = readFileSync(resolve(out, file), "utf8");
        const url = `"${site}${path}"`;
        if (!html.includes(ROOT) || !html.includes(url)) throw new Error(`${file} has no ${ROOT} or no ${url} for its canonical address`);
        writeFileSync(resolve(out, file), html.replaceAll(url, `"${site}${path}${more}"`).replace(ROOT, () => `<div id="root">${root}</div>`));
      };
      // /games and /creators the same way, one page at a time (see "location ~ ^/games/?$" in nginx.conf): each page
      // (/games?page=2) is its own canonical address, and searches and filters get no text (nginx marks them noindex).
      const pageOf = (n: string) => `<!--# if expr="$${n} != 1" -->?page=<!--# echo var="${n}" --><!--# endif -->`;
      fill("games.html", PAGES.games.path, `<!--# if expr="$games_ssr = yes" --><!--# include virtual="/_ssr/games?page=$games_page" --><!--# endif -->`, pageOf("games_page"));
      const addHeadInclude = (file: string, include: string) => {
        const html = readFileSync(resolve(out, file), "utf8");
        const end = "<!--/seo-->";
        if (!html.includes(end)) throw new Error(`${file} has no SEO block for structured data`);
        writeFileSync(resolve(out, file), html.replace(end, `${include}\n    ${end}`));
      };
      addHeadInclude("games.html", '<!--# if expr="$games_ssr = yes" --><script type="application/ld+json"><!--# include virtual="/_ssr/games-schema?page=$games_page" --></script><!--# endif -->');
      fill("creators.html", PAGES.creators.path, `<!--# if expr="$creators_ssr = yes" --><!--# include virtual="/_ssr/creators?page=$creators_page" --><!--# endif -->`, pageOf("creators_page"));
      // /tournament, and /leaderboard (this week's, ?period=week, is its own address).
      fill("tournament.html", PAGES.tournament.path, `<!--# include virtual="/_ssr/tournament" -->`);
      fill("leaderboard.html", PAGES.leaderboard.path, `<!--# include virtual="/_ssr/leaderboard?period=$leaderboard_period" -->`,
        `<!--# if expr="$leaderboard_period = week" -->?period=week<!--# endif -->`);
      addHeadInclude("leaderboard.html", '<script type="application/ld+json"><!--# include virtual="/_ssr/leaderboard-schema?period=$leaderboard_period" --></script>');
      // Features' pages, from the API while the feature is on (see "location ~ ^/_ssr/feature/" in nginx.conf).
      fill("spotlight.html", PAGES.spotlight.path, `<!--# include virtual="/_ssr/feature/spotlight" -->`);
      fill("creators-board.html", PAGES.creatorsBoard.path, `<!--# include virtual="/_ssr/feature/by" -->`);
      fill("shop.html", PAGES.shop.path, `<!--# include virtual="/_ssr/feature/shop" -->`);
      fill("friends-tournaments.html", PAGES.friendsTournaments.path, `<!--# include virtual="/_ssr/feature/friends" -->`);
      // /docs and /hangout: written into the page at build time (they change only with a deploy).
      fill("docs.html", PAGES.docs.path, docsText(site));
      fill("about.html", PAGES.about.path, renderToStaticMarkup(createElement(AboutView)));
      // The questions as FAQ data for search engines and answer engines (the same words as the page).
      const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: QUESTIONS.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) };
      const about = readFileSync(resolve(out, "about.html"), "utf8");
      if (!about.includes("<!--/seo-->")) throw new Error("about.html has no seo block");
      writeFileSync(resolve(out, "about.html"), about.replace("<!--/seo-->", () => `<script type="application/ld+json">${JSON.stringify(faq).replace(/</g, "\\u003c")}</script>
    <!--/seo-->`));
      fill("hangout.html", PAGES.hangout.path, hangoutText());
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /approve/\nDisallow: /connect\n\nSitemap: ${site}/sitemap.xml\n`);
      const urls = SITEMAP_PATHS.map((p) => `  <url><loc>${site}${p}</loc></url>`).join("\n");
      writeFileSync(resolve(out, "sitemap.static.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    },
  };
}

export default defineConfig(({ mode }) => {
  // VITE_SITE_URL: the public address, for canonical links and previews (default https://start.ng).
  const site = (loadEnv(mode, process.cwd(), "VITE_").VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
  return {
    plugins: [react(), seoPages(site)],
    // three.js (~520 kB) is split into its own chunk and only loads for the character creator and avatar.
    build: { chunkSizeWarningLimit: 600 },
  };
});

