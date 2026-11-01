import { useEffect, useState } from "react";
import type { PageProps } from "../registry";
import { formatStat, shortName } from "../../BoardTable";
import { PAGES, setSeo } from "../../seo";
import { deleteTournament, Detail, getTournament, isDetail, joinTournament, leaveTournament, newInviteLink, Summary } from "./api";
import { endsText, timeLeft } from "./time";

function Dot({ color }: { color: string | null }) {
  return <span className="dot" style={{ background: color ?? "var(--line)" }} />;
}

/** start.ng/friends/<code>: the invite link (join), then the games, standings and how long is left. */
export default function TournamentPage({ user, onSignIn, params }: PageProps) {
  const code = params.code;
  const [t, setT] = useState<Summary | Detail | null | undefined>(undefined); // null: no such tournament
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const playerId = user?.id ?? null;
  const link = `${location.origin}/friends/${code}`;
  const canShare = typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches; // phones and tablets

  // The invite page is private (noindex), but its title names the tournament, so a link pasted in a chat says what it is.
  useEffect(() => {
    const base = PAGES.privateTournament;
    setSeo(t ? (t.by_admin
      ? { ...base, title: `${t.title} · start.ng tournament`, description: `Register for "${t.title}" on start.ng to see the games and play.` }
      : { ...base, title: `${t.title} · tournament with friends · start.ng`, description: `Join "${t.title}" on start.ng: ${t.games.length} ${t.games.length === 1 ? "game" : "games"}, ${t.members} ${t.members === 1 ? "player" : "players"}.` }) : base);
  }, [t]);
  useEffect(() => {
    const load = () => getTournament(code).then(setT).catch((e) => (/no tournament/i.test(String(e?.message)) ? setT(null) : setError("Couldn't load this tournament. Try again in a moment.")));
    load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    return () => window.clearInterval(timer);
  }, [code, user?.id]);

  async function act(fn: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setError("");
    try {
      await fn();
      after ? after() : setT(await getTournament(code));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* the address bar has the link */ }
  }

  async function swapLink() {
    if (!confirm("Make a new invite link? The old link stops working. Everyone who has joined stays in.")) return;
    setBusy(true);
    setError("");
    try {
      location.assign(`/friends/${(await newInviteLink(code)).code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  async function share() {
    // Phones and tablets: the share menu (WhatsApp, Telegram, SMS...). Elsewhere there is no menu, so copy the link.
    try {
      await navigator.share({ title: t?.title, text: `Join my start.ng tournament${t ? ` "${t.title}"` : ""}!`, url: link });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") copy();
    }
  }

  if (t === undefined && !error) return <section className="container tournament-page"><p className="board-sub">Loading…</p></section>;
  if (t === null) {
    return (
      <section className="container tournament-page">
        <p className="empty">There's no tournament at this link. <a href="/friends">Start your own</a></p>
      </section>
    );
  }
  if (!t) return <section className="container tournament-page"><p className="error">{error}</p></section>;

  const left = timeLeft(t.ends_at);
  const startsLater = new Date(t.starts_at).getTime() > Date.now(); // F9: an admin's tournament can start later
  const text = t.by_admin ? `Register for "${t.title}" on start.ng!`
    : `Join my start.ng tournament "${t.title}"! ${t.games.length} ${t.games.length === 1 ? "game" : "games"}, ${left}.`;
  const whatsapp = `https://wa.me/?${new URLSearchParams({ text: `${text} ${link}` })}`;
  const detail = isDetail(t) ? t : null;

  return (
    <section className="container tournament-page">
      <div className="section-head">
        <div>
          <h1>{t.title}</h1>
          <p className="tournament-sub">By {t.owner} · {t.members} {t.members === 1 ? "player" : "players"} · <a href="/friends">Your tournaments →</a></p>
        </div>
      </div>

      <div className="tournament-status">
        <div>
          <span className={`tag ${t.finished ? "done" : ""}`}>{startsLater ? `Starts in ${timeLeft(t.starts_at).replace(" left", "")}` : left}</span>
          {startsLater
            ? <p>Starts <b>{endsText(t.starts_at)}</b>, ends <b>{endsText(t.ends_at)}</b> your time. Scores count once it starts.</p>
            : <p>{t.finished ? "Ended" : "Ends"} <b>{endsText(t.ends_at)}</b> your time.</p>}
          <p className="note">Each game gives 10 points for 1st, 7 for 2nd, 5 for 3rd, 3 for 4th and 1 for everyone else who plays it. Most points wins. Nothing counts toward the main leaderboard.</p>
        </div>
        <div className="tournament-enter">
          {!t.joined && !t.finished && (
            <>
              <button type="button" disabled={busy} onClick={() => (user ? act(() => joinTournament(code)) : onSignIn())}>
                {t.by_admin
                  ? (user ? (busy ? "Registering…" : "Register") : "Sign in to register")
                  : (user ? (busy ? "Joining…" : "Join this tournament") : "Sign in to join")}
              </button>
              <p className="note">{t.by_admin ? "Register to see the games." : "Scores count from the moment you join."}{t.max_members ? ` Up to ${t.max_members} players.` : ""}</p>
            </>
          )}
          {!t.joined && t.finished && <p className="note">This tournament has ended.</p>}
          {t.joined && (
            <>
              <p className="ok">You're in.{detail?.me ? ` You're #${detail.me.place} with ${detail.me.points} ${detail.me.points === 1 ? "point" : "points"}.` : " Play a game below to get on the table."}</p>
              {!t.finished && (
                <div className="private-share">
                  {canShare && <button type="button" onClick={share}>Share the link</button>}
                  <a className={canShare ? "btn ghost" : "btn"} href={whatsapp} target="_blank" rel="noreferrer">Invite on WhatsApp</a>
                  <button type="button" className="ghost" onClick={copy}>{copied ? "Link copied" : "Copy link"}</button>
                </div>
              )}
            </>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      </div>

      {detail ? (
        <>
          <div className="grid tournament-games">
            {detail.game_boards.map((g) => {
              const first = g.leaderboard[0];
              return (
                <article key={g.name} className="game">
                  <a className="game-link" href={`/games/${g.name}`}>
                    <div className="art">{g.cover_url ? <img src={g.cover_url} alt="" loading="lazy" decoding="async" /> : <span>{g.name.charAt(0).toUpperCase()}</span>}</div>
                    <div className="info">
                      <h3>{g.name.replace(/-/g, " ")}</h3>
                      <p>{g.players} {g.players === 1 ? "player" : "players"}</p>
                    </div>
                  </a>
                  <ol className="tournament-top">
                    {g.top.length === 0 && <li className="none">No scores yet. Be the first.</li>}
                    {g.top.slice(0, 3).map((r) => (
                      <li key={r.player_id} className={r.player_id === playerId ? "me" : ""}>
                        <span className="nm" title={r.name}><Dot color={r.color} />{shortName(r.name)}</span>
                        <span className="sc">{formatStat(first, r.stats[first.key])}</span>
                      </li>
                    ))}
                  </ol>
                  {!t.finished && <div className="meta"><a className="play" href={g.url} target="_blank" rel="noreferrer">Play ↗</a></div>}
                </article>
              );
            })}
          </div>

          <section aria-labelledby="private-standings">
            <h2 id="private-standings" className="private-heading">Standings</h2>
            {detail.standings.length === 0 ? (
              <p className="board-empty">No points yet. Play one of the games above and you'll show up here.</p>
            ) : (
              <div className="board-table overall-board" role="table" aria-label="Standings" style={{ gridTemplateColumns: "36px minmax(0, 1fr) auto auto" }}>
                <div className="board-row board-head" role="row">
                  <span role="columnheader">#</span>
                  <span role="columnheader">Player</span>
                  <span role="columnheader" className="num">Firsts</span>
                  <span role="columnheader" className="num">Points</span>
                </div>
                {detail.standings.map((s) => (
                  <div key={s.player_id} role="row" className={`board-row ${s.player_id === playerId ? "me" : ""}`}>
                    <span className="rk" role="cell">{s.place}</span>
                    <span className="nm" role="cell" title={s.name}><Dot color={s.color} />{shortName(s.name)}{s.player_id === playerId && <em> (you)</em>}</span>
                    <span className="num" role="cell">{s.firsts}</span>
                    <span className="num sc" role="cell">{s.points}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="private-manage">
            {t.mine && !t.finished && (
              <button type="button" className="link" disabled={busy} onClick={swapLink}>New invite link</button>
            )}
            {t.mine ? (
              <button type="button" className="link flag" disabled={busy} onClick={() => { if (confirm("Delete this tournament for everyone?")) act(() => deleteTournament(code), () => location.assign("/friends")); }}>Delete tournament</button>
            ) : (
              <button type="button" className="link" disabled={busy} onClick={() => { if (confirm("Leave this tournament? Your scores in it are removed.")) act(() => leaveTournament(code), () => location.assign("/friends")); }}>Leave tournament</button>
            )}
          </div>
        </>
      ) : (
        t.by_admin && !t.joined ? <p className="empty">The games show here once you register.</p> : <div className="grid tournament-games" aria-label="The games">
          {t.games.map((name) => (
            <article key={name} className="game"><div className="info"><h3>{name.replace(/-/g, " ")}</h3></div></article>
          ))}
        </div>
      )}
    </section>
  );
}
