import { withHandle } from "../../share";

// What the character says and shows when it acts as a helper (see Mascot.tsx): short tips that come one at a time, a tour of the
// home page, and the cheer for a win. Plain data, so the words are easy to change.

// Pages and features the design-only site does not have (the tournament, the shop, the categories hub) are on the real site.
export const LIVE = "https://start.ng";

export type Action = { label: string; href?: string; share?: string; tour?: true };
export type Tip = { id: string; text: string; actions: Action[]; home?: boolean };

/** Tips, shown one at a time and each only once per visitor. The first has to be the one that offers the tour. */
export const TIPS: Tip[] = [
  { id: "tour", home: true, text: "Hi, I'm your guide. Want a quick tour of start.ng?", actions: [{ label: "Take the tour", tour: true }] },
  { id: "tournament", text: "Today's tournament is on: a few games, 24 hours, one winner. Come and check it out.", actions: [{ label: "Check it out", href: `${LIVE}/tournament` }] },
  { id: "items", text: "New items are in the shop. Come and have a look.", actions: [{ label: "See the shop", href: `${LIVE}/shop` }] },
  { id: "share", text: "Enjoying start.ng? Tell a friend: share it on X.", actions: [{ label: "Share on X", share: "I'm playing games on start.ng. Come and play with me!" }] },
  { id: "categories", text: "Not sure what to play? Pick a category and find your kind of game.", actions: [{ label: "Browse categories", href: `${LIVE}/categories` }] },
  { id: "creators", text: "Made a game? Put it on start.ng, or send it to the creators page.", actions: [{ label: "Go to creators", href: "/creators" }] },
];

export type Step = { text: string; target: () => Element | null };
const q = (selector: string) => () => document.querySelector(selector);
const signIn = () => [...document.querySelectorAll(".nav button")].find((b) => /sign in/i.test(b.textContent ?? "")) ?? null;

/** The tour of the home page. A step whose target is not on the page is skipped. */
export const TOUR: Step[] = [
  { text: "Welcome to start.ng. These are games made by builders in the community, and you play them right in your browser.", target: q(".hero") },
  { text: "Use these links to get around: all games, the daily tournament, creators and the docs.", target: q(".nav") },
  { text: "Pick a category to find your kind of game: runners, racing, brainy games and more.", target: q(".tags-picks") },
  { text: "Every game has its own page, with its leaderboard. Tap one to see it.", target: q("#games") },
  { text: "The daily tournament: a few games, 24 hours, one winner. Share it to enter, then play.", target: q('.nav a[href="/tournament"]') },
  { text: "Games from independent creators live here. They are hosted on the creators' own sites.", target: q("#creators") },
  { text: "Made a game? This is how you put it on start.ng.", target: q("#how") },
  { text: "Sign in to save your scores, make your character and keep your favourites.", target: signIn },
  { text: "More links live down here. That's the tour. Tap me any time to see it again.", target: q(".site-footer") },
];

export const xShareUrl = (text: string, url = LIVE) => `https://twitter.com/intent/tweet?${new URLSearchParams({ text: withHandle(text), url })}`;

// What the helper remembers in this browser: whether it is switched on, which tips it has already given, and when it last spoke.
const ON = "startng-guide-on", SEEN = "startng-guide-seen", LAST = "startng-guide-last", WON = "startng-guide-won", LEFT = "startng-guide-left";
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: it lasts until the page closes */ } };
export const store = {
  isOn: () => get(ON) !== "off",
  setOn: (on: boolean) => set(ON, on ? "on" : "off"),
  seen: (): string[] => { try { return JSON.parse(get(SEEN) ?? "[]"); } catch { return []; } },
  markSeen: (id: string) => { const s = store.seen(); if (!s.includes(id)) set(SEEN, JSON.stringify([...s, id])); set(LAST, String(Date.now())); },
  sinceLast: () => Date.now() - Number(get(LAST) ?? 0),
  // Coming back from a game: where you went (a link to a game's own address) and, if the game said so, that you won. The game's
  // /connect page is on start.ng, so it can set startng-guide-won = {"game":"bingo","at":<ms>} for the helper to find on your return.
  setLeft: (game: string) => set(LEFT, JSON.stringify({ game, at: Date.now() })),
  left: (): { game: string } | null => recent(LEFT, 3 * 60 * 60 * 1000),
  won: (): { game: string } | null => recent(WON, 30 * 60 * 1000),
  clearTrip: () => { try { localStorage.removeItem(LEFT); localStorage.removeItem(WON); } catch { /* nothing to clear */ } },
};
function recent(key: string, ms: number): { game: string } | null {
  try {
    const v = JSON.parse(get(key) ?? "null");
    return v && typeof v.game === "string" && Date.now() - Number(v.at) < ms ? { game: v.game } : null;
  } catch { return null; }
}

/** "coconut-dodge" becomes "Coconut Dodge". */
export const titleOf = (slug: string) => slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
