import { useEffect } from "react";
import ThemeToggle from "./ThemeToggle";

// Shown for any address that isn't one of the app's pages. nginx serves it with a real
// 404 status (see nginx.conf); the Vite dev server shows it too, with a 200.
export default function NotFound() {
  useEffect(() => {
    document.title = "Page not found · start.ng";
  }, []);

  return (
    <>
      <header className="container nav">
        <a className="logo" href="/"><b>start<span>.ng</span></b></a>
        <nav>
          <a href="/games">Games</a>
          <a href="/#how">How it works</a>
          <a href="/docs">Docs</a>
          <ThemeToggle />
        </nav>
      </header>
      <main>
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
      </main>
    </>
  );
}
