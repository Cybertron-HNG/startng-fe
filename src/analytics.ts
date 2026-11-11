// Google Analytics 4 for start.ng: page views (GA follows the app's address changes by itself) and a few
// key actions, so we can see what people do and whether start.ng is spreading.
//
// It only runs on the live site: not in `npm run dev`, not on localhost, and not on /connect (games load
// that page invisibly, so it would count a fake visit every time someone opens a game).
// The measurement ID is public (it's in every page's HTML). VITE_GA_MEASUREMENT_ID can change it at build
// time, or switch analytics off with "off".

const DEFAULT_ID = "G-9K8146WXDG"; // start.ng's web stream (Google Analytics > Admin > Data streams > Website)

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const configured = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim();
const ID = configured === "off" ? "" : configured || DEFAULT_ID;

function shouldRun() {
  const host = location.hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
  return import.meta.env.PROD && !!ID && !local && location.pathname !== "/connect";
}

/** Loads Google's tag once, at startup. */
export function initAnalytics() {
  if (!shouldRun() || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  // gtag must push the `arguments` object itself, not an array (that's how Google's snippet works).
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", ID);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`;
  document.head.appendChild(script);
}

type Params = Record<string, string | number | boolean | undefined>;

/** Records one action. Does nothing where analytics doesn't run, so it's safe to call anywhere. */
export function track(event: string, params: Params = {}) {
  window.gtag?.("event", event, params);
}

// The actions start.ng records. Names follow Google's recommended events where one fits
// (login, share, view_item), so they show up in its standard reports.
export const analytics = {
  viewGame: (game: string) => track("view_item", { item_id: game, item_category: "game" }),
  play: (game: string) => track("play_game", { game }),
  playIndie: (id: number) => track("play_game", { game: `indie-${id}`, indie: true }),
  share: (contentType: "game" | "indie_game" | "tournament" | "share_card", id: string, method: "x" | "copy_link" | "whatsapp" | "share_menu" | "embed_snippet") =>
    track("share", { method, content_type: contentType, item_id: id }),
  login: () => track("login", { method: "Google" }),
  enterTournament: (id: number) => track("tournament_enter", { tournament_id: id }),
  publishGame: (game: string) => track("publish_game", { game }),
};
