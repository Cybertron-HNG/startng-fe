import { useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import { PAGES, setSeo } from "./seo";
import { SiteFooterView } from "./SiteFooterView";

// Shown for any address that isn't one of the app's pages. nginx serves it with a real
// 404 status (see nginx.conf); the Vite dev server shows it too, with a 200.
export default function NotFound() {
  return (
    <>
      <header className="container nav">
        <a className="logo" href="/"><b>start<span>.ng</span></b></a>
        <nav aria-label="Pages">
          <a href="/games">Games</a>
          <a href="/tournament">Tournament</a>
          <a href="/creators">Creators</a>
          <a href="/docs">Docs</a>
        </nav>
        <div className="nav-account"><ThemeToggle /></div>
      </header>
      <main>
        <NotFoundSection />
      </main>
      <SiteFooterView />
    </>
  );
}

/** The "Page not found" part on its own, for a page that already has the header (like /creators?page= past the end). */
export function NotFoundSection() {
  useEffect(() => {
    setSeo(PAGES.notFound);
  }, []);

  return (
    <section className="container hero">
      <p className="eyebrow">404</p>
      <h1>Page not <mark>found.</mark></h1>
      <p className="lead">
        There's nothing at <code>{location.pathname}</code>.{" "}<br />
        Looking for a game? Each one lives at its own address, like <code>yourgame.start.ng</code>.
      </p>
      <div className="actions">
        <a className="btn" href="/">Go to the homepage</a>
        <a className="btn ghost" href="/games">Browse games</a>
      </div>
    </section>
  );
}
