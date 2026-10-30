import type { ReactNode } from "react";
import { ABOUT, QUESTIONS } from "./home-copy";
import { SiteFooterView } from "./SiteFooterView";

// The /about page. Pure, so the build can write the same page into about.html for search engines and AI tools
// (vite.config.ts) and the app draws it again when it loads (About.tsx). Its words are the homepage's (home-copy.ts) plus
// the places to go next.
const WAYS: [string, string, string][] = [
  ["Play", "Pick a game from the community and play it right in your browser, free, with nothing to download.", "/games"],
  ["Compete", "Join the daily tournament and climb the overall leaderboard.", "/tournament"],
  ["Independent creators", "Games made and hosted by creators outside start.ng, each with its own page.", "/creators"],
  ["Make a game", "Push your browser game to a public GitHub repo, publish it with one API call and approve it once. The docs have every step.", "/docs"],
];

export default function AboutView({ themeToggle }: { themeToggle?: ReactNode }) {
  return (
    <>
      <header className="container nav">
        <a className="logo" href="/"><b>start<span>.ng</span></b></a>
        <nav aria-label="Pages">
          <a href="/games">Games</a>
          <a href="/tournament">Tournament</a>
          <a href="/friends">Friends</a>
          <a href="/creators">Creators</a>
          <a href="/docs">Docs</a>
        </nav>
        <div className="nav-account">{themeToggle}</div>
      </header>
      <main>
        <section className="container about about-page">
          <p className="eyebrow">About</p>
          <h1>About start.ng</h1>
          {ABOUT.map((p) => <p key={p} className="lead">{p}</p>)}

          <h2>What you can do here</h2>
          <ul className="about-ways">
            {WAYS.map(([title, text, href]) => (
              <li key={href}><a href={href}><b>{title}</b><span>{text}</span></a></li>
            ))}
          </ul>

          <h2>Questions</h2>
          <div className="about-questions">
            {QUESTIONS.map(([q, a]) => (
              <div key={q}><h3>{q}</h3><p>{a}</p></div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooterView />
    </>
  );
}
