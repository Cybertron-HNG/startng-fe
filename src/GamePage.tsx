import { useEffect, useState } from "react";
import { analytics } from "./analytics";
import BoardTable from "./BoardTable";
import { FavoriteButton } from "./Favorites";
import { User } from "./api";
import { Game, isInAppGame } from "./games";
import PageParts from "./features/PageParts";
import ReportDialog from "./Report";
import { PAGES, setSeo } from "./seo";
import { withHandle } from "./share";

// start.ng/games/<name>: a game's own page on start.ng, shown before the game itself. Search engines
// and shared links land here (the API serves this address with the text already in it, see
// startng-be app/routers/pages.py), and Play goes on to the game's address.
export default function GamePage({ name, game, loading, user, playerId, favorite, onPlay, onSignIn, inTournament = false, canFlag = false, onHidden }: {
  name: string;
  game: Game | undefined;
  loading: boolean;
  user: User | null;
  playerId: number | null;
  favorite: { on: boolean; toggle: () => void };
  onPlay: (e: React.MouseEvent, g: Game) => void;
  onSignIn: () => void;
  inTournament?: boolean; // one of today's tournament games
  canFlag?: boolean; // the signed-in admin may flag games (app/admin.py on the API)
  onHidden?: () => void; // the game was reported or flagged, so it's hidden now
}) {
  const [copied, setCopied] = useState(false);
  const [reporting, setReporting] = useState<"report" | "flag" | null>(null);
  const found = !!game;

  useEffect(() => {
    if (game) {
      analytics.viewGame(game.slug);
      setSeo({
        title: `${game.title} · Play free on start.ng`,
        description: game.description ?? `Play ${game.title} free in your browser on start.ng, a game by ${game.by}.`,
        path: `/games/${game.slug}`,
        ...(game.cover ? { image: game.cover, imageAlt: `${game.title} cover` } : {}),
      });
    } else if (!loading) {
      setSeo(PAGES.notFound);
    }
  }, [game, loading]);

  if (!found) {
    return (
      <section className="container game-page">
        <a className="back" href="/games">← All games</a>
        {loading ? (
          <div className="game-page-grid" aria-busy="true">
            <div className="art skeleton" />
            <div className="game-page-body">
              <span className="skeleton line title big" />
              <span className="skeleton line host" />
              <span className="skeleton line by" />
            </div>
          </div>
        ) : (
          <p className="empty">There's no game called “{name}” on start.ng. <a href="/games">Browse all games</a></p>
        )}
      </section>
    );
  }

  const g = game;
  const pageUrl = `${location.origin}/games/${g.slug}`;
  const description = g.description ?? `Play ${g.title} free in your browser, right here on start.ng. A game by ${g.by}.`;
  const tweet = `https://twitter.com/intent/tweet?${new URLSearchParams({ text: withHandle(`Come play ${g.title} on start.ng!`), url: pageUrl })}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      analytics.share("game", g.slug, "copy_link");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* no clipboard (older browsers): the address bar has the link */ }
  }

  return (
    <section className="container game-page">
      <a className="back" href="/games">← All games</a>
      <div className="game-page-grid">
        <div className="art" style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }}>
          {g.cover ? <img src={g.cover} alt={`${g.title} cover`} decoding="async" /> : <span>{g.title.charAt(0)}</span>}
        </div>
        <div className="game-page-body">
          {inTournament && <a className="tag tournament-badge" href="/tournament">In today's tournament →</a>}
          <h1>{g.title}</h1>
          <p className="game-page-by">by {g.by} · <code>{g.host}</code></p>
          <p className="game-page-description">{description}</p>
          <div className="game-page-actions">
            <a className="btn" href={g.url} {...(isInAppGame(g) ? {} : { target: "_blank", rel: "noreferrer" })} onClick={(e) => onPlay(e, g)}>
              {isInAppGame(g) ? "Play" : "Play ↗"}
            </a>
            <FavoriteButton user={user} on={favorite.on} name={g.title} onToggle={favorite.toggle} onSignIn={onSignIn} />
          </div>
        </div>
      </div>
      <div className="game-page-rows">
        <div className="game-page-share">
          <span>Share it</span>
          <a className="ghost btn" href={tweet} target="_blank" rel="noreferrer" onClick={() => analytics.share("game", g.slug, "x")}>Share on X</a>
          <button type="button" className="ghost" onClick={copy}>{copied ? "Link copied" : "Copy link"}</button>
        </div>
        <PageParts page="game" user={user} onSignIn={onSignIn} game={g.slug} currentGame={g} />
      </div>
      {g.board && (
        <aside className="game-page-board" aria-labelledby="board-heading">
          <h2 id="board-heading">Leaderboard <span>Top 10</span></h2>
          <BoardTable game={g} playerId={playerId} />
        </aside>
      )}
      {g.slug !== "hangout" && (
        <div className="game-page-report">
          <button type="button" className="link" onClick={() => (user ? setReporting("report") : onSignIn())}>
            Report this game
          </button>
          {canFlag && <button type="button" className="link flag" onClick={() => setReporting("flag")}>Flag game (admin)</button>}
        </div>
      )}
      {reporting && (
        <ReportDialog game={g.slug} title={g.title} mode={reporting} onClose={() => setReporting(null)}
          onDone={() => { setReporting(null); if (reporting === "flag") onHidden?.(); }} />
      )}
    </section>
  );
}
