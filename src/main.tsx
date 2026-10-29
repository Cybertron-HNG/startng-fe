import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import About from "./About";
import Docs from "./Docs";
import Privacy from "./Privacy";
import Terms from "./Terms";
import { serveConnect } from "./games";
import NotFound from "./NotFound";
import { initAnalytics } from "./analytics";
import "./features"; // every feature registers its pages, card parts and admin tabs (src/features/index.ts)
import FeatureGate from "./features/FeatureGate";
import { findPage } from "./features/registry";
import "./styles.css";

// The Hangout (start.ng's own game, with three.js) loads only when someone opens it.
const Hangout = lazy(() => import("./hangout/Hangout"));
// The admin page loads only for admins who open it.
const Admin = lazy(() => import("./Admin"));

// Google Analytics (live site only, never on /connect).
initAnalytics();

// The app's pages. Keep these in step with the locations in nginx.conf.
const HOME_PATHS = ["/", "/index.html"];
const HANGOUT_PATH = "/hangout";
const APPROVE_PATH = /^\/approve\/[\w-]{8,40}\/?$/; // the homepage, with "put this game live?" on top
const DOCS_PATHS = ["/docs", "/docs/"];
const ABOUT_PATHS = ["/about", "/about/"]; // what start.ng is, and the questions
const PRIVACY_PATHS = ["/privacy", "/privacy/"]; // what we collect and what you can ask us to do about it
const TERMS_PATHS = ["/terms", "/terms/"]; // the rules for playing and for publishing a game
const ADMIN_PATHS = ["/admin", "/admin/"]; // admins only (the API checks)
const GAMES_PATHS = ["/games", "/games/"]; // every game, a page at a time
const TOURNAMENT_PATHS = ["/tournament", "/tournament/"]; // today's tournament
const LEADERBOARD_PATHS = ["/leaderboard", "/leaderboard/"]; // tournament points, all time and this week
const CREATORS_PATHS = ["/creators", "/creators/"]; // every game by independent creators
const INDIE_PATH = /^\/creators\/(\d{1,10})(?:-[a-z0-9-]*)?\/?$/; // one independent creator's game page
const GAME_PATH = /^\/games\/([a-z0-9][a-z0-9-]{0,39})\/?$/; // one game's page, before its own address
// A game's about / how to play / FAQ / walkthrough pages: the server writes the whole page (startng-be app/features/game_pages).
// The category pages are written by the server too (startng-be app/features/tags): /categories and /categories/<slug>.
const CATEGORY_PATH = /^\/categories(\/[a-z0-9][a-z0-9-]{0,39})?\/?$/;
const INDIE_SUB_PATH = /^\/creators\/(\d{1,10})(?:-[a-z0-9-]*)?\/(about|faq)\/?$/; // the About and FAQ pages of an independent creator's game
const GAME_SUB_PATH = /^\/games\/([a-z0-9][a-z0-9-]{0,39})\/(about|how-to-play|faq|walkthrough)\/?$/;

// nginx answers a missing page with the generated 404.html (status 404). It loads this same file, at the address that was asked
// for, so a missing /categories/<slug> looks like a category page to the checks below. It marks itself noindex; the plain page
// that stands in when the API is down does not.
const isNotFoundPage = document.querySelector('meta[name="robots"]')?.getAttribute("content")?.includes("noindex") ?? false;

// /connect is loaded invisibly by games, so it renders nothing.
if (location.pathname === "/connect") {
  serveConnect();
} else if (CATEGORY_PATH.test(location.pathname) && !isNotFoundPage) {
  // React does not start here: the server's page is the page, for everyone. If it could not be written (the plain page came
  // back, with nothing in it), go to the games. nginx serves a missing category as the 404 page: that one stays as it is.
  if (!document.querySelector(".tags-page")) location.replace("/games");
} else if (GAME_SUB_PATH.test(location.pathname) && !isNotFoundPage) {
  // React does not start here: the server's page is the page, for everyone. If the server could not write it (the plain
  // page came back, with nothing in it), go to the game's own page instead of showing nothing.
  if (!document.querySelector(".game-sub")) location.replace(`/games/${location.pathname.match(GAME_SUB_PATH)![1]}`);
} else if (INDIE_SUB_PATH.test(location.pathname) && !isNotFoundPage) {
  // The same for a game by an independent creator: if the server could not write the page, go to the game's own page.
  if (!document.querySelector(".game-sub")) location.replace(`/creators/${location.pathname.match(INDIE_SUB_PATH)![1]}`);
} else {
  const path = location.pathname;
  const feature = findPage(path); // a feature's page (src/features), shown only while its flag is on
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      {HOME_PATHS.includes(path) || APPROVE_PATH.test(path) || GAMES_PATHS.includes(path) || CREATORS_PATHS.includes(path) || TOURNAMENT_PATHS.includes(path) || LEADERBOARD_PATHS.includes(path) || GAME_PATH.test(path) || INDIE_PATH.test(path) ? (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""}>
          <App
            view={INDIE_PATH.test(path) ? "indie" : GAME_PATH.test(path) ? "game" : GAMES_PATHS.includes(path) ? "games" : CREATORS_PATHS.includes(path) ? "creators" : TOURNAMENT_PATHS.includes(path) ? "tournament" : LEADERBOARD_PATHS.includes(path) ? "leaderboard" : "home"}
            gameName={path.match(GAME_PATH)?.[1]}
            indieId={Number(path.match(INDIE_PATH)?.[1]) || undefined}
          />
        </GoogleOAuthProvider>
      ) : path === HANGOUT_PATH ? (
        <Suspense fallback={null}>
          <Hangout />
        </Suspense>
      ) : ADMIN_PATHS.includes(path) ? (
        <Suspense fallback={null}>
          <Admin />
        </Suspense>
      ) : DOCS_PATHS.includes(path) ? (
        <Docs />
      ) : ABOUT_PATHS.includes(path) ? (
        <About />
      ) : PRIVACY_PATHS.includes(path) ? (
        <Privacy />
      ) : TERMS_PATHS.includes(path) ? (
        <Terms />
      ) : feature?.page.shell === "app" ? (
        <FeatureGate feature={feature.page.feature} off={<NotFound />}>
          <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""}>
            <App view="feature" featurePage={feature} />
          </GoogleOAuthProvider>
        </FeatureGate>
      ) : feature ? (
        <FeatureGate feature={feature.page.feature} off={<NotFound />}>
          <Suspense fallback={null}>
            <feature.page.Component user={null} onSignIn={() => location.assign("/?signin")} params={feature.params} />
          </Suspense>
        </FeatureGate>
      ) : (
        <NotFound />
      )}
    </React.StrictMode>
  );
}
