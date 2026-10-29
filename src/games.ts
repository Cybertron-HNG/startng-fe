import { BoardStat, getLeaderboard, getLiveTicket, me, pingSession, PublishedGame, submitScore } from "./api";
import { CharacterStyle, styleFor } from "./character";

// A homepage card for a game from GET /games (games published with POST /games/publish).
// The API only knows the name, so the title and colours are worked out from it:
// the same game always gets the same colours.
// cover is the game's picture; without one the card shows the title's first letter on the colours.
export type Game = { slug: string; title: string; url: string; host: string; by: string; colors: [string, string]; cover: string | null; board: BoardStat[] | null; plays: number; description: string | null; updated_at?: string | null };

const CARD_COLORS: [string, string][] = [
  ["#ffd400", "#e10600"],
  ["#1dd1a1", "#0c6e5a"],
  ["#a55eea", "#4b7bec"],
  ["#ff6b6b", "#f7b731"],
  ["#45aaf2", "#2b2f4a"],
  ["#fd9644", "#eb3b5a"],
];

// The Hangout is start.ng's own game. It lives inside this app at /hangout instead of on a
// hangout.start.ng address, so the homepage always shows it. If the API ever lists a game
// with the same name, this card is the one that's shown.
export const HANGOUT: Game = {
  slug: "hangout",
  title: "The Hangout",
  url: "/hangout",
  host: "start.ng/hangout",
  by: "start.ng",
  colors: ["#292a23", "#5b7d0d"],
  cover: "/hangout-cover.jpg", // a screenshot of the park, in public/
  board: null, // the Hangout has no leaderboard
  plays: 0,
  description: "start.ng's own multiplayer park. Sign in as your character, walk around and meet everyone else who's there.",
  updated_at: null,
};

/** A game that lives inside this app (opens in the same tab) rather than on its own start.ng address. */
export const isInAppGame = (game: Game) => game.url.startsWith("/");

// The API writes game addresses as https://, which is right on start.ng. Locally the Worker's
// dev server is plain http, so local *.localhost games are linked over http.
export function playableUrl(url: string) {
  const u = new URL(url);
  if (u.hostname.endsWith(".localhost")) u.protocol = "http:";
  return u.href.replace(/\/$/, "");
}

/** The colour pair for a name (a game or a category): the same name always gets the same pair. */
export function colorsFor(name: string): [string, string] {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CARD_COLORS[hash % CARD_COLORS.length];
}

export function toCard(game: PublishedGame): Game {
  const url = playableUrl(game.url);
  return {
    slug: game.name,
    title: game.name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    url,
    host: new URL(url).host,
    by: game.by,
    colors: colorsFor(game.name),
    cover: game.cover_url,
    board: game.leaderboard ?? null,
    plays: game.plays ?? 0,
    description: game.description ?? null,
    updated_at: game.updated_at ?? null,
  };
}

// Games are static sites on <name>.start.ng. This is how start.ng shares the signed-in
// user with them: a game loads /connect in a hidden iframe and asks who is signed in.
// Games get the user's id, character name and style only, never the token or email.

const GAME_ORIGINS = [
  /^https:\/\/[a-z0-9-]+\.start\.ng$/,
  /^http:\/\/[a-z0-9-]+\.start\.localhost(:\d+)?$/, // local testing
];

export function isGameOrigin(origin: string) {
  return GAME_ORIGINS.some((re) => re.test(origin));
}

/** The ?return_to= URL if it points at a game (or the Hangout), otherwise null (so it can't redirect anywhere else). */
export function gameReturnUrl(): string | null {
  const raw = new URLSearchParams(location.search).get("return_to");
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const isHangout = url.origin === location.origin && url.pathname === HANGOUT.url;
    return isGameOrigin(url.origin) || isHangout ? url.href : null;
  } catch {
    return null;
  }
}

// What games receive as the player's look. Players make it in the character creator;
// accounts without one get a starting look worked out from their id.
export type GameStyle = CharacterStyle;
export { styleFor };

/** How players who aren't signed in look in every start.ng game. */
export const GUEST_STYLE: CharacterStyle = {
  body: "male",
  primaryColor: "#9aa3b5",
  secondaryColor: "#4a4f60",
  skinColor: "#c68642",
  hairColor: "#17120f",
  hair: "short",
  hat: "none",
  accessory: "none",
};

// The game a message came from: lanedash.start.ng -> "lanedash". Taken from the origin the
// browser reports, never from the message, so a game can only save scores for itself.
const gameFromOrigin = (origin: string) => new URL(origin).hostname.split(".")[0];
const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

// The answer to "who is signed in?" takes real work: ask the API who the token belongs to, load three.js
// and draw the character's face. Games ask in a hidden frame with short timeouts (one polls every half
// second), and a phone can take longer than that, so the game wrongly decided nobody was signed in and
// offered "sign in or guest" again. So it's prepared once, as soon as /connect loads, and every question
// is answered from that. A failed attempt (offline) isn't kept, so the next question tries again.
let prepared: Promise<object> | null = null;

async function buildWhoami(): Promise<object> {
  const user = await me(localStorage.getItem("token")); // throws if the API can't be reached: not kept
  const { faceImage } = await import("./three/snapshot");
  const style = user ? user.character?.style ?? styleFor(user.id) : null;
  return {
    type: "startng:user",
    user: user && style && {
      id: user.id,
      name: user.character?.name ?? user.name ?? "Player",
      account: user.name ?? null,
      style,
      face: faceImage(style),
    },
    guest: { name: "Guest", style: GUEST_STYLE, face: faceImage(GUEST_STYLE) },
  };
}

function whoami(): Promise<object> {
  const attempt = (prepared ??= buildWhoami());
  attempt.catch(() => { if (prepared === attempt) prepared = null; });
  // If the API can't be reached, say signed out for now (as before) but retry on the next question.
  return attempt.catch(async () => {
    const { faceImage } = await import("./three/snapshot");
    return { type: "startng:user", user: null, guest: { name: "Guest", style: GUEST_STYLE, face: faceImage(GUEST_STYLE) } };
  });
}

// What /connect answers. Every reply echoes the request's requestId.
type Message = { type: string; requestId?: unknown; score?: unknown; stats?: unknown; limit?: unknown; sessionId?: unknown; event?: unknown; kit?: unknown };
const handlers: Record<string, (msg: Message, game: string) => Promise<object>> = {
  // { type: "startng:whoami" }
  //   -> { type: "startng:user", user: { id, name, account, style, face } | null, guest: { name, style, face } }
  // face is a picture of the character's face (a PNG data URL) for games that show a profile card.
  // guest is start.ng's one look for players who aren't signed in, so every game shows the same.
  "startng:whoami": () => whoami(),

  // { type: "startng:score", score } or { type: "startng:score", stats: { ... } } (the game's startng.json stats)
  //   -> { type: "startng:scoreSaved", ok, result: { best, improved, rank, stats } | error }
  "startng:score": async (msg, game) => {
    const token = localStorage.getItem("token");
    if (!token) return { type: "startng:scoreSaved", ok: false, error: "Sign in to save your score" };
    const run = msg.stats !== undefined ? { stats: msg.stats as Record<string, unknown> } : { score: msg.score as number };
    if (run.score !== undefined && (!Number.isSafeInteger(run.score) || run.score < 0)) {
      return { type: "startng:scoreSaved", ok: false, error: "A score must be a whole number, 0 or more" };
    }
    try {
      return { type: "startng:scoreSaved", ok: true, result: await submitScore(token, game, run) };
    } catch (err) {
      return { type: "startng:scoreSaved", ok: false, error: errorText(err, "Could not save the score") };
    }
  },

  // { type: "startng:leaderboard", limit? } -> { type: "startng:leaderboardData", ok, entries | error }
  "startng:leaderboard": async (msg, game) => {
    const limit = Number.isInteger(msg.limit) ? Math.min(Math.max(msg.limit as number, 1), 50) : 10;
    try {
      return { type: "startng:leaderboardData", ok: true, entries: await getLeaderboard(game, limit) };
    } catch (err) {
      return { type: "startng:leaderboardData", ok: false, error: errorText(err, "Could not load the leaderboard") };
    }
  },

  // { type: "startng:session", event: "start" | "heartbeat" | "end", sessionId, kit? } from kit.js (no reply needed)
  //   -> { type: "startng:sessionNoted" }
  // How long people play (PRD M1, game_sessions). Signed-in players are linked; guests are counted without one.
  "startng:session": async (msg, game) => {
    const events = ["start", "heartbeat", "end"];
    if (typeof msg.sessionId === "string" && typeof msg.event === "string" && events.includes(msg.event)) {
      const kit = typeof msg.kit === "string" ? msg.kit.slice(0, 16) : undefined;
      void pingSession(localStorage.getItem("token"), game, { session_id: msg.sessionId.slice(0, 64), event: msg.event, kit });
    }
    return { type: "startng:sessionNoted" };
  },

  // { type: "startng:ticket" } -> { type: "startng:ticketData", ok, ticket, url | error }
  // For multiplayer games: open `${url}?ticket=${ticket}` within a minute. The ticket only opens
  // this game's live room; it isn't a sign-in.
  "startng:ticket": async (_msg, game) => {
    const token = localStorage.getItem("token");
    if (!token) return { type: "startng:ticketData", ok: false, error: "Sign in with start.ng to join" };
    try {
      return { type: "startng:ticketData", ok: true, ...(await getLiveTicket(token, game)) };
    } catch (err) {
      return { type: "startng:ticketData", ok: false, error: errorText(err, "Could not join the game") };
    }
  },
};

// The handlers by name, in a Map so a message can only pick one of ours.
const handlerFor = new Map(Object.entries(handlers));

/** Runs on /connect: answers games (and nobody else) about the signed-in player, scores and live rooms. */
export function serveConnect() {
  void whoami(); // start preparing now, before the first question arrives
  // Signing in or out in another tab changes the answer.
  window.addEventListener("storage", (e) => { if (e.key === "token") { prepared = null; void whoami(); } });
  window.addEventListener("message", async (e) => {
    if (!isGameOrigin(e.origin)) return; // only games answer, and nobody else is asked anything
    const handle = typeof e.data?.type === "string" ? handlerFor.get(e.data.type) : undefined; // our own handlers only, never "constructor" and the like
    if (!handle) return;
    const reply = await handle(e.data, gameFromOrigin(e.origin));
    (e.source as Window | null)?.postMessage({ ...reply, requestId: e.data.requestId }, e.origin);
  });
}

/** Whether the game was updated within the last 7 days. */
export function isRecentlyUpdated(isoDate: string | null | undefined): boolean {
  if (!isoDate) return false;
  const then = new Date(isoDate).getTime();
  if (isNaN(then)) return false;
  const diff = Date.now() - then;
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

/** Friendly relative update text, e.g. "today", "yesterday", "2 days ago". */
export function formatUpdatedAgo(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const then = new Date(isoDate).getTime();
  if (isNaN(then)) return null;
  const diff = Date.now() - then;
  if (diff < 0) return null;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}
