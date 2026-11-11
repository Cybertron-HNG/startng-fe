// Page titles, descriptions and link previews (Open Graph / Twitter cards).
//
// The app is client-rendered, but chat apps and search crawlers read the HTML they are served and
// often don't run JavaScript. So every page's tags live here once and are used twice:
//  - vite.config.ts writes one HTML file per page at build time (games.html, docs.html ...), which
//    nginx serves for that address, so a shared link shows the right preview;
//  - setSeo() keeps the tags right while someone moves around the app without a reload.
// Keep the paths in step with main.tsx and nginx.conf.

export const SITE_NAME = "start.ng";
export const DEFAULT_SITE_URL = "https://start.ng";
/** The picture shown in link previews (in public/). */
export const SHARE_IMAGE = "/hangout-cover.jpg";
export const SHARE_IMAGE_ALT = "A screenshot of the Hangout, start.ng's own multiplayer game";
/** The tournament's own preview picture (in public/): shown on X and in chats when /tournament is shared. */
export const TOURNAMENT_IMAGE = "/tournament-share.png";
export const TOURNAMENT_IMAGE_ALT = "start.ng's daily tournament: 5 games, 24 hours, one winner, with covers of games from the community";
/** The creators page's preview picture (in public/): an invitation to submit a game, shown when /creators is shared. */
export const CREATORS_IMAGE = "/creators-share.png";
export const CREATORS_IMAGE_ALT = "Made a game? Get it played. Submit your game to start.ng/creators, with covers of games by independent creators";

export type Seo = {
  title: string;
  description: string;
  /** The page's address, without the site: "/games". */
  path: string;
  /** Keep the page out of search results (sign-in flows, 404). */
  noindex?: boolean;
  /** No canonical link or og:url: the page has no address of its own to point at (404). */
  noCanonical?: boolean;
  /** Its own preview picture: a path in public/ or a full address, like a game's cover (default SHARE_IMAGE). */
  image?: string;
  imageAlt?: string;
};

const HOME_DESCRIPTION =
  "Nigeria's home for free browser games. Play Naija-themed web games like Danfo Defense and Jollof Rush, no download. Built by the HNG community.";

export const PAGES: Record<string, Seo> = {
  home: { title: "start.ng · Good vibes. Good games.", description: HOME_DESCRIPTION, path: "/" },
  games: {
    title: "All games from the community · start.ng",
    description: "Browse and search every game built by the start.ng community. Pick one and play right in your browser, no download needed.",
    path: "/games",
  },
  creators: {
    title: "Games by independent creators · start.ng",
    description: "Discover games made and hosted by independent creators, from itch.io to their own sites. Search them all, or submit your own.",
    path: "/creators",
    image: CREATORS_IMAGE,
    imageAlt: CREATORS_IMAGE_ALT,
  },
  about: {
    title: "About start.ng · Nigeria's home for browser games",
    description: "start.ng is Nigeria's home for free browser games, built by the HNG community. What it is, what you can do here, and answers to common questions.",
    path: "/about",
  },
  hangout: {
    title: "The Hangout · start.ng",
    description: "The Hangout is start.ng's own multiplayer park. Sign in as your character, walk around and meet everyone else who's there.",
    path: "/hangout",
  },
  docs: {
    title: "Docs: publish a game on start.ng",
    description: "How to publish a browser game on start.ng: push it to GitHub, make one API call, approve it once, and it's live at yourgame.start.ng with its own leaderboard.",
    path: "/docs",
  },
  tournament: {
    title: "Today's tournament · start.ng",
    description: "Every day, a few start.ng games for 24 hours and one winner. Share to enter, play, and climb the standings.",
    path: "/tournament",
    image: TOURNAMENT_IMAGE,
    imageAlt: TOURNAMENT_IMAGE_ALT,
  },
  leaderboard: {
    title: "Leaderboard · start.ng",
    description: "The best players on start.ng: points from the daily tournaments, all time and this week.",
    path: "/leaderboard",
    image: TOURNAMENT_IMAGE,
    imageAlt: TOURNAMENT_IMAGE_ALT,
  },
  // The plain page nginx falls back to for /games/<name> when the API can't render that game's page.
  game: {
    title: "Play free on start.ng",
    description: "Play free browser games made by the HNG community on start.ng.",
    path: "/games",
  },
  approve: {
    title: "Put your game live · start.ng",
    description: "Approve a game you published to start.ng and put it live at its own address.",
    path: "/",
    noindex: true,
  },
  // Tournaments with friends (src/features/private_tournaments): the page that starts one, and an invite link's page.
  friendsTournaments: {
    title: "Start a tournament with your friends · start.ng",
    description: "Pick any games on start.ng, set how long it runs, and share a link. Your friends join and you all follow one table of scores.",
    path: "/friends",
  },
  privateTournament: {
    title: "Join a tournament with friends · start.ng",
    description: "You've been invited to a tournament on start.ng. Join it, play its games and see where you stand.",
    path: "/friends",
    noindex: true, // an invite link is private; the page sets its own title once it knows the tournament
  },
  // Friends & follows (src/features/follows): your lists and an invite link's page. Both private.
  follows: {
    title: "Your friends · start.ng",
    description: "Your friends on start.ng, who you follow and who follows you, and a link to invite new friends.",
    path: "/follows",
    noindex: true,
  },
  friendInvite: {
    title: "You're invited to be friends · start.ng",
    description: "Someone wants to be friends with you on start.ng. Accept and you'll follow each other.",
    path: "/follows",
    noindex: true, // an invite link is private
  },
  // Leagues (src/features/leagues): your group, tier and countdown in each track. Signed in only, so private.
  league: {
    title: "Your league · start.ng",
    description: "Your league on start.ng: play any game to score, finish in the top 5 of your group to move up a tier.",
    path: "/league",
    noindex: true,
  },
  // Wardrobe (src/features/wardrobe): your coins and items, and the daily shop.
  wardrobe: {
    title: "Your wardrobe · start.ng",
    description: "Your coins and items on start.ng: earn them by playing any game, and wear them in every game.",
    path: "/wardrobe",
    noindex: true,
  },
  shop: {
    title: "Shop · start.ng",
    description: "Spend the coins you earn playing start.ng games on items for your character. New stock every day.",
    path: "/shop",
  },
  profile: {
    title: "A player on start.ng",
    description: "A player's page on start.ng: their character, level, badges and best scores.",
    path: "/me",
    noindex: true, // player pages stay out of search results
  },
  spotlight: {
    title: "Spotlight · start.ng",
    description: "The Game of the Week and today's daily challenge on start.ng: one goal a day, set from how people really play.",
    path: "/spotlight",
  },
  creator: {
    title: "A creator on start.ng",
    description: "A creator's games on start.ng: play them free in your browser, follow them, and share.",
    path: "/by",
  },
  creatorsBoard: {
    title: "Top creators · start.ng",
    description: "The creators whose games the most different players opened this month on start.ng.",
    path: "/by",
  },
  // A game jam's page (src/features/jams): the plain page nginx falls back to when the API can't write the jam's own.
  jam: {
    title: "A game jam on start.ng",
    description: "A game jam on start.ng: a theme and a deadline. Creators enter a game, players who played it vote, and the best win.",
    path: "/jam",
  },
  notFound: {
    title: "Page not found · start.ng",
    description: "There's nothing at this address. Browse the games on start.ng instead.",
    path: "/",
    noindex: true,
    noCanonical: true,
  },
};

/** Pages that get their own HTML file at build time: [file name, page]. */
export const STATIC_PAGES: [string, Seo][] = [
  ["games.html", PAGES.games],
  ["creators.html", PAGES.creators],
  ["hangout.html", PAGES.hangout],
  ["docs.html", PAGES.docs],
  ["about.html", PAGES.about],
  ["tournament.html", PAGES.tournament],
  ["leaderboard.html", PAGES.leaderboard],
  ["game.html", PAGES.game],
  ["spotlight.html", PAGES.spotlight],
  ["creators-board.html", PAGES.creatorsBoard],
  ["creator.html", PAGES.creator],
  ["approve.html", PAGES.approve],
  ["friends-tournaments.html", PAGES.friendsTournaments],
  ["private-tournament.html", PAGES.privateTournament],
  ["follows.html", PAGES.follows],
  ["friend-invite.html", PAGES.friendInvite],
  ["league.html", PAGES.league],
  ["wardrobe.html", PAGES.wardrobe],
  ["shop.html", PAGES.shop],
  ["profile.html", PAGES.profile],
  ["jam.html", PAGES.jam],
  ["404.html", PAGES.notFound],
];

/** Pages that belong in sitemap.xml. */
export const SITEMAP_PATHS = ["home", "games", "creators", "tournament", "leaderboard", "hangout", "docs", "about"].map((k) => PAGES[k].path);

/** A picture's full address: paths in public/ get the site in front, full addresses stay as they are. */
const imageUrl = (site: string, image: string) => (/^https?:\/\//.test(image) ? image : site + image);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** The <head> tags for a page, as HTML. `site` is the public origin, like https://start.ng. */
export function headTags(seo: Seo, site: string): string {
  const url = site + (seo.path === "/" ? "/" : seo.path);
  const image = imageUrl(site, seo.image ?? SHARE_IMAGE);
  const tags = [
    `<title>${esc(seo.title)}</title>`,
    `<meta name="description" content="${esc(seo.description)}" />`,
    `<meta name="robots" content="${seo.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"}" />`,
    ...(seo.noCanonical ? [] : [`<link rel="canonical" href="${esc(url)}" />`]),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(seo.title)}" />`,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
    ...(seo.noCanonical ? [] : [`<meta property="og:url" content="${esc(url)}" />`]),
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:alt" content="${esc(seo.imageAlt ?? SHARE_IMAGE_ALT)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(seo.title)}" />`,
    `<meta name="twitter:description" content="${esc(seo.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ];
  return tags.join("\n    ");
}

/** Structured data for the homepage, so search engines know what start.ng is. */

/** Structured data for the /games page: BreadcrumbList and CollectionPage. */
export function gamesJsonLd(site: string): string {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site + "/" },
          { "@type": "ListItem", position: 2, name: "Games", item: site + "/games" },
        ],
      },
      {
        "@type": "CollectionPage",
        name: PAGES.games.title,
        description: PAGES.games.description,
        url: site + "/games",
      },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

/** Structured data for the /leaderboard page: BreadcrumbList. */
export function leaderboardJsonLd(site: string): string {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site + "/" },
          { "@type": "ListItem", position: 2, name: "Leaderboard", item: site + "/leaderboard" },
        ],
      },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}
export function jsonLd(site: string): string {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: SITE_NAME, url: site + "/", logo: site + "/favicon.svg" },
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: site + "/",
        description: HOME_DESCRIPTION,
        potentialAction: { "@type": "SearchAction", target: `${site}/games?q={search_term_string}`, "query-input": "required name=search_term_string" },
      },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

/** The public origin, from the same VITE_SITE_URL the build uses, so a preview or alternate host still points at the real address. */
function siteUrl(): string {
  return (import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
}

/** Update the tags of the page that's open (when moving between pages or searching without a reload). */
export function setSeo(seo: Seo) {
  document.title = seo.title;
  const url = siteUrl() + seo.path;
  const robots = seo.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large";
  const upsert = (tag: "meta" | "link", selector: string, attrs: Record<string, string>) => {
    let el = document.head.querySelector(selector);
    if (!el) document.head.appendChild((el = document.createElement(tag)));
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  };
  const meta = (key: "name" | "property", name: string, content: string) =>
    upsert("meta", `meta[${key}="${name}"]`, { [key]: name, content });
  meta("name", "description", seo.description);
  meta("name", "robots", robots);
  meta("property", "og:title", seo.title);
  meta("property", "og:description", seo.description);
  if (!seo.noCanonical) meta("property", "og:url", url);
  else document.head.querySelector('meta[property="og:url"]')?.remove();
  meta("name", "twitter:title", seo.title);
  meta("name", "twitter:description", seo.description);
  const image = imageUrl(siteUrl(), seo.image ?? SHARE_IMAGE);
  meta("property", "og:image", image);
  meta("property", "og:image:alt", seo.imageAlt ?? SHARE_IMAGE_ALT);
  meta("name", "twitter:image", image);
  if (!seo.noCanonical) upsert("link", 'link[rel="canonical"]', { rel: "canonical", href: url });
  else document.head.querySelector('link[rel="canonical"]')?.remove();
}
