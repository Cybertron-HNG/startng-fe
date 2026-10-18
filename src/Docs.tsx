import { useEffect, useState } from "react";
import { me, User } from "./api";
import AccountMenu from "./AccountMenu";
import { Markdown, slug } from "./markdown";
import ThemeToggle from "./ThemeToggle";
import ScrollJump from "./ScrollJump";
import { PAGES, setSeo } from "./seo";

// start.ng/docs: the builder docs. The words live in public/docs.md (also served as-is at
// start.ng/docs.md for AI tools), so the page and the file never disagree.
export default function Docs() {
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  // Who's signed in, for the same top bar as the homepage.
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) me(token).then(setUser).catch(() => {});
  }, []);

  function signOut() {
    localStorage.removeItem("token");
    setUser(null);
  }

  useEffect(() => {
    setSeo(PAGES.docs);
    fetch("/docs.md")
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then(setSource)
      .catch(() => setFailed(true));
  }, []);

  // Jump to #section once the page has drawn.
  useEffect(() => {
    if (source && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [source]);

  const sections = (source ?? "").split("\n").filter((l) => l.startsWith("## ")).map((l) => l.slice(3));
  const docsUrl = `${location.origin}/docs.md`;

  function copyForAi() {
    navigator.clipboard
      ?.writeText(`Build and publish a game for start.ng. Read and follow ${docsUrl}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  }

  return (
    <>
      <header className="container nav">
        <a className="logo" href="/"><b>start<span>.ng</span></b></a>
        <nav aria-label="Pages">
          <a href="/games">Games</a>
          <a href="/creators">Creators</a>
          <a href="/#how">How it works</a>
          <a href="/docs" aria-current="page">Docs</a>
        </nav>
        <div className="nav-account">
          <ThemeToggle />
          {user ? (
            <AccountMenu user={user} onProfile={() => location.assign("/?profile")} onFavorites={() => location.assign("/?favorites")} onSignOut={signOut} />
          ) : (
            <button onClick={() => location.assign("/?signin")}>Sign in</button>
          )}
        </div>
      </header>
      <main className="container docs">
        <aside className="docs-side">
          <div className="ai-box">
            <b>Building with AI?</b>
            <span>Give it this page as plain text:</span>
            <code>{docsUrl.replace(/^https?:\/\//, "")}</code>
            <button type="button" onClick={copyForAi}>{copied ? "Copied" : "Copy a prompt for your AI"}</button>
            {/* For AI tools that take a file upload instead of a link. */}
            <a className="btn ghost" href="/docs.md" download="startng-docs.md">Download as .md</a>
          </div>
          {sections.length > 0 && (
            <nav className="toc" aria-label="On this page">
              {sections.map((s) => (
                <a key={s} href={`#${slug(s)}`}>{s.replace(/`/g, "")}</a>
              ))}
            </nav>
          )}
        </aside>
        <article className="docs-body">
          {failed && <p className="error">Couldn't load the docs. Try again, or read <a href="/docs.md">docs.md</a>.</p>}
          {!source && !failed && <p className="empty">Loading…</p>}
          {source && <Markdown source={source} />}
        </article>
      </main>
      <footer className="container footer">
        <span>start<span>.ng</span></span>
        <span>Built by the HNG community</span>
      </footer>
      <ScrollJump />
    </>
  );
}
