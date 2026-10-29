import { useCallback, useEffect, useState } from "react";
import type { PageProps } from "../registry";
import { PAGES, setSeo } from "../../seo";
import { entryLine, getJam, howToEnter, unvote, vote, when, type JamPage as Page } from "./api";
import "./jams.css";

/** start.ng/jam/<slug>: a game jam. Its theme, dates and entries, and during voting week a Vote button on each entry for players
 *  who have played it. The API writes the same words for search engines (startng-be app/features/jams/server_page.py). */
export default function JamPage({ user, onSignIn, params }: PageProps) {
  const slug = params.slug;
  const [page, setPage] = useState<Page | null | undefined>(undefined); // null: no such jam
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => getJam(slug)
    .then((got) => {
      setPage(got);
      setSeo({ title: `${got.jam.title} · Game jam · start.ng`, description: `${got.jam.title}: a game jam on start.ng. ${got.jam.brief}`.slice(0, 300), path: `/jam/${slug}` });
    })
    .catch((e) => {
      if (e instanceof Error && /No jam/.test(e.message)) {
        setPage(null);
        setSeo({ ...PAGES.notFound, title: "No jam here · start.ng", description: "There is no game jam at this address.", path: `/jam/${slug}` });
      } else setError("Couldn't load this jam. Try again in a moment.");
    }), [slug]);
  useEffect(() => { load(); }, [load, user?.id]);

  async function toggle(game: string, voted: boolean) {
    setBusy(game); setError("");
    try { await (voted ? unvote(slug, game) : vote(slug, game)); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't save your vote"); }
    finally { setBusy(null); }
  }

  if (page === undefined && !error) return <section className="container jam-page"><p className="board-sub" role="status">Loading…</p></section>;
  if (page === null) {
    return (
      <section className="container jam-page">
        <h1>No jam here</h1>
        <p>There is no game jam at this address.</p>
        <p><a className="btn" href="/games">Browse all games</a></p>
      </section>
    );
  }
  if (!page) return <section className="container jam-page"><p className="error" role="alert">{error}</p></section>;

  const { jam, entries } = page;
  const over = jam.phase === "over";
  const enter = howToEnter(jam);
  return (
    <section className="container jam-page">
      <p className="eyebrow">Game jam</p>
      <h1>{jam.title}</h1>
      <p className="lead-sm">{jam.brief}</p>
      <p className="jam-when">{when(jam)}</p>
      {enter && <p className="jam-enter">{enter}</p>}
      <h2>Entries ({entries.length})</h2>
      {error && <p className="error" role="alert">{error}</p>}
      {entries.length === 0 ? <p className="empty">No entries yet.</p> : (
        <ul className="jam-entries">
          {entries.map((e) => (
            <li key={e.game} className={e.winner ? `jam-entry winner-${e.winner}` : "jam-entry"}>
              {e.cover_url ? <img src={e.cover_url} alt="" loading="lazy" /> : <span className="tile" aria-hidden="true">{e.title.charAt(0)}</span>}
              <div className="jam-entry-text">
                <a href={`/games/${e.game}`}>{e.title}</a> <span>{entryLine(e, over)}</span>
              </div>
              {jam.phase === "voting" && (
                e.voted || e.can_vote
                  ? <button type="button" className={e.voted ? "ghost" : ""} disabled={busy === e.game} onClick={() => toggle(e.game, e.voted)}>
                      {e.voted ? "Voted ✓" : "Vote"}
                    </button>
                  : e.why_not === "Sign in to vote"
                    ? <button type="button" className="ghost" onClick={onSignIn}>Sign in to vote</button>
                    : e.why_not && <em className="jam-why">{e.why_not}</em>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
