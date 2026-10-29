// The blog (start.ng/blog, Ziki #27). Each post is a Markdown file in public/blog/<slug>.md, listed here newest first.
// The build writes every post into its own page (blog-<slug>.html, see vite.config.ts), so search engines and AI tools
// read the whole post without running the app; the app shows the same file (src/Blog.tsx). Add a post: write the .md,
// add a line here, and it is in the index, the sitemap and nginx's /blog/<slug> with no other change.

export type Post = {
  slug: string; // its address: /blog/<slug>
  title: string;
  description: string; // one or two sentences, for search results and link previews
  date: string; // "2026-10-29", when it was published
};

export const POSTS: Post[] = [
  {
    slug: "publish-a-browser-game",
    title: "How to publish a browser game on start.ng",
    description: "From a GitHub repo to a live game at yourgame.start.ng in one request: what a start.ng game is, how to put it live, and how updates work.",
    date: "2026-10-29",
  },
  {
    slug: "the-start-ng-kit",
    title: "The start.ng Kit: sign-in, scores and sharing in one line",
    description: "Add one script tag to your game and players get their start.ng character, their scores save, and the end-of-round card shares to X.",
    date: "2026-10-29",
  },
  {
    slug: "how-the-daily-tournament-works",
    title: "How the start.ng daily tournament works",
    description: "Five games, 24 hours, one winner: how to enter, how points are counted, and how the overall leaderboard adds them up.",
    date: "2026-10-29",
  },
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "29 October 2026": the same on the page the build writes and in the app. */
export const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug);
