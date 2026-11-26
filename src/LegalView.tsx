import type { ReactNode } from "react";
import { LEGAL } from "./legal-copy";
import { SiteFooterView } from "./SiteFooterView";

// The /privacy and /terms pages. Pure, so the build can write the same words into privacy.html and terms.html for search
// engines and AI tools (vite.config.ts) and the app draws the page again when it loads (Privacy.tsx, Terms.tsx).
// It is laid out like the About page (AboutView.tsx): the same bar, eyebrow, big h1 and footer.

/** The [link](/address) and **bold** marks in the copy (legal-copy.ts) as real markup, for both versions of the page. */
function Rich({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const marks = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let done = 0;
  for (let m = marks.exec(text); m; m = marks.exec(text)) {
    if (m.index > done) parts.push(text.slice(done, m.index));
    parts.push(m[1] ? <a key={m.index} href={m[2]}>{m[1]}</a> : <b key={m.index}>{m[3]}</b>);
    done = m.index + m[0].length;
  }
  if (done < text.length) parts.push(text.slice(done));
  return <>{parts}</>;
}

export default function LegalView({ page, themeToggle }: { page: "privacy" | "terms"; themeToggle?: ReactNode }) {
  const doc = LEGAL[page];
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
        <div className="nav-account">{themeToggle}</div>
      </header>
      <main>
        <section className="container about about-page legal-page">
          <p className="eyebrow">{doc.eyebrow}</p>
          <h1>{doc.title}</h1>
          <p className="lead">{doc.intro}</p>
          <p className="legal-updated">Last updated {doc.updated}</p>
          {doc.sections.map((section) => (
            <div key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((p) => <p key={p}><Rich text={p} /></p>)}
            </div>
          ))}
        </section>
      </main>
      <SiteFooterView />
    </>
  );
}
