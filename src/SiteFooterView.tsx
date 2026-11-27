/** The site's footer, as plain markup (no flags, no data), so the build can write it into pages (vite.config.ts). SiteFooter (SiteFooter.tsx) is the one
 *  the app draws. The server writes the same footer on its own pages (startng-be app/server_html.py, site_footer): keep the words and links
 *  the same in all three. Categories is always listed: the pages the build writes (/about, /docs, 404) can't know the tags flag,
 *  so a flagged link made those pages differ from what React draws (Ziki idea #96). */
export function SiteFooterView() {
  return (
    <footer className="container site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <a className="logo" href="/"><b>start<span>.ng</span></b></a>
          <p>Nigeria's home for browser games, made by the community and by creators across Africa.</p>
        </div>
        <nav aria-label="Play">
          <h2>Play</h2>
          <ul>
            <li><a href="/games">All games</a></li>
            <li><a href="/tournament">Daily tournament</a></li>
            <li><a href="/leaderboard">Leaderboard</a></li>
            <li><a href="/categories">Categories</a></li>
            <li><a href="/hangout">The Hangout</a></li>
          </ul>
        </nav>
        <nav aria-label="Make games">
          <h2>Make games</h2>
          <ul>
            <li><a href="/creators">Independent creators</a></li>
            <li><a href="/docs">Build a game</a></li>
            <li><a href="/docs.md">Docs for your AI (.md)</a></li>
          </ul>
        </nav>
        <nav aria-label="About">
          <h2>About</h2>
          <ul>
            <li><a href="/about">About start.ng</a></li>
          </ul>
        </nav>
      </div>
      <p className="site-footer-base">
        <span>© {new Date().getFullYear()} start.ng</span>
        <span>Games from Nigeria and across Africa.</span>
      </p>
    </footer>
  );
}
