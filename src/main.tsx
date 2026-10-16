import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import Docs from "./Docs";
import { serveConnect } from "./games";
import NotFound from "./NotFound";
import "./styles.css";

// The Hangout (start.ng's own game, with three.js) loads only when someone opens it.
const Hangout = lazy(() => import("./hangout/Hangout"));

// The app's pages. Keep these in step with the locations in nginx.conf.
const HOME_PATHS = ["/", "/index.html"];
const HANGOUT_PATH = "/hangout";
const APPROVE_PATH = /^\/approve\/[\w-]{8,40}\/?$/; // the homepage, with "put this game live?" on top
const DOCS_PATHS = ["/docs", "/docs/"];
const GAMES_PATHS = ["/games", "/games/"]; // every game, a page at a time
const EXPLORE_PATHS = ["/explore", "/explore/"]; // games other people host on their own sites

// /connect is loaded invisibly by games, so it renders nothing.
if (location.pathname === "/connect") {
  serveConnect();
} else {
  const path = location.pathname;
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      {HOME_PATHS.includes(path) || APPROVE_PATH.test(path) || GAMES_PATHS.includes(path) || EXPLORE_PATHS.includes(path) ? (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""}>
          <App view={GAMES_PATHS.includes(path) ? "games" : EXPLORE_PATHS.includes(path) ? "explore" : "home"} />
        </GoogleOAuthProvider>
      ) : path === HANGOUT_PATH ? (
        <Suspense fallback={null}>
          <Hangout />
        </Suspense>
      ) : DOCS_PATHS.includes(path) ? (
        <Docs />
      ) : (
        <NotFound />
      )}
    </React.StrictMode>
  );
}
