import { useCallback, useEffect, useState } from "react";
import type { PageProps } from "../registry";
import { formatStat, shortName } from "../../BoardTable";
import { PAGES, setSeo } from "../../seo";
import { adminPreview, enterMajor, gameTitle, getMajor, leaveMajor, ordinal, type Major } from "./api";
import { dayOnly, dayTime, until } from "./when";
import "./majors.css";

function Dot({ color }: { color: string | null }) {
  return <span className="dot" style={{ background: color ?? "var(--line)" }} />;
}

/** start.ng/majors/<slug>: a major. The partner and the prizes, a way in, the games with their boards, the standings,
 *  and the winners once it has ended. */
export default function MajorPage({ user, onSignIn, params }: PageProps) {
  const slug = params.slug;
  const [m, setM] = useState<Major | null | undefined>(undefined); // null: no such major
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const [allRows, setAllRows] = useState(false);
  const playerId = user?.id ?? null;
  const link = `${location.origin}/majors/${slug}`;
  const canShare = typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches; // phones and tablets

  // Players get the published page. An admin also sees a draft (the API refuses everyone else), to check it before it goes out.
  const load = useCallback(() => getMajor(slug).catch(() => adminPreview(slug)).then(setM).catch((e) => {
    if (e instanceof Error && /no major|not found|admin/i.test(e.message)) setM(null);
    else setError("Couldn't load this major. Try again in a moment.");
  }), [slug]);
  useEffect(() => {
    load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    return () => window.clearInterval(timer);
  }, [load, user?.id]);
  useEffect(() => {
    if (m) setSeo({ title: `${m.title} · with ${m.partner.name} · start.ng`, description: m.tagline, path: `/majors/${slug}`, noindex: !m.published });
    else if (m === null) setSeo({ ...PAGES.notFound, title: "No major here · start.ng", description: "There is no major at this address.", path: `/majors/${slug}` });
  }, [m, slug]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
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

  if (m === undefined && !error) return <section className="container tournament-page major-page"><p className="board-sub" role="status">Loading…</p></section>;
  if (m === null) {
    return (
      <section className="container tournament-page major-page">
        <h1>No major here</h1>
        <p className="empty">There is no major at this address. <a href="/majors">See the majors</a></p>
      </section>
    );
  }
  if (!m) return <section className="container tournament-page major-page"><p className="error" role="alert">{error}</p></section>;

  const ended = m.state === "ended";
  const top = m.prizes.length;
  const text = `I'm playing the ${m.title} on start.ng. Top ${top} win: ${m.prizes[0].prize}.`;
  const whatsapp = `https://wa.me/?${new URLSearchParams({ text: `${text} ${link}` })}`;
  const tweet = `https://twitter.com/intent/tweet?${new URLSearchParams({ text, url: link })}`;
  async function share() {
    try {
      await navigator.share({ title: m?.title, text, url: link });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") copy();
    }
  }

  const show = filter;
  const setShow = setFilter;
  const games = m.game_boards.filter((g) => (show === "todo" ? !g.mine : show === "done" ? !!g.mine : true));
  const rows = allRows ? m.standings : m.standings.slice(0, 10);
  const total = m.game_boards.length;

  return (
    <section className="container tournament-page major-page">
      {!m.published && <p className="major-draft" role="status">Draft: only admins can see this page. Publish it on the admin page when it's ready.</p>}

      <div className="major-hero">
        <div className="major-hero-top">
          <div>
            <p className="eyebrow">Major · start.ng × {m.partner.name}</p>
            <h1>{m.title}</h1>
            <p className="major-tagline">{m.tagline}</p>
          </div>
          {m.partner.logo_url && (
            <a className="major-logo" href={m.partner.url ?? undefined} target="_blank" rel="noreferrer" aria-label={m.partner.name}>
              <img src={m.partner.logo_url} alt={`${m.partner.name} logo`} />
            </a>
          )}
        </div>

        <dl className="major-facts">
          <div><dt>{m.state === "upcoming" ? "Starts in" : ended ? "Ended" : "Time left"}</dt><dd>{m.state === "upcoming" ? until(m.starts_at) : ended ? dayOnly(m.ends_at) : until(m.ends_at)}</dd></div>
          <div><dt>Players</dt><dd>{m.entrants.toLocaleString()}</dd></div>
          <div><dt>Games</dt><dd>{total}</dd></div>
          <div><dt>Prizes</dt><dd>Top {top}</dd></div>
        </dl>

        <div className="major-cta">
          {!m.entered && !ended && (
            <>
              <button type="button" disabled={busy} onClick={() => (user ? act(() => enterMajor(slug)) : onSignIn())}>
                {user ? (busy ? "Entering…" : "Enter the major") : "Sign in to enter"}
              </button>
              <p className="note">Free to enter. Your scores count from the moment you enter. {m.state === "upcoming" ? `It starts ${dayTime(m.starts_at)}` : `It ends ${dayTime(m.ends_at)}`} your time.</p>
            </>
          )}
          {!m.entered && ended && <p className="note">This major ended {dayTime(m.ends_at)} your time.</p>}
          {m.entered && m.removed && <p className="error">You've been taken out of this major. If you think that's a mistake, use Help to tell us.</p>}
          {m.entered && !m.removed && (
            <>
              <div className="major-me">
                <p className="ok">You're in.{m.me ? ` You're #${m.me.place} with ${m.me.points} ${m.me.points === 1 ? "point" : "points"}.` : m.state === "upcoming" ? " Come back when it starts." : " Play a game below to get on the table."}</p>
                {m.state !== "upcoming" && (
                  <div className="major-progress" role="img" aria-label={`You've played ${m.played} of ${total} games`}>
                    <span><i style={{ width: `${(m.played / total) * 100}%` }} /></span>
                    <b>{m.played} of {total} games played</b>
                  </div>
                )}
                {!ended && m.played < total && m.state === "running" && <p className="note">Every game you play adds at least 1 point, so play them all.</p>}
              </div>
              {!ended && (
                <div className="private-share">
                  {canShare && <button type="button" onClick={share}>Share</button>}
                  <a className={canShare ? "btn ghost" : "btn"} href={whatsapp} target="_blank" rel="noreferrer">Share on WhatsApp</a>
                  <a className="btn ghost" href={tweet} target="_blank" rel="noreferrer">Share on X</a>
                  <button type="button" className="ghost" onClick={copy}>{copied ? "Link copied" : "Copy link"}</button>
                </div>
              )}
              {m.state === "upcoming" && <button type="button" className="link" disabled={busy} onClick={() => act(() => leaveMajor(slug))}>Leave the major</button>}
            </>
          )}
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      </div>

      <section aria-labelledby="major-prizes">
        <h2 id="major-prizes" className="private-heading">{ended && m.winners.length > 0 ? "Winners" : "Prizes"}</h2>
        <ol className="major-prizes">
          {m.prizes.map((p) => {
            const w = m.winners.find((x) => x.place === p.place);
            const leader = !ended ? m.standings.find((s) => s.place === p.place) : undefined;
            return (
              <li key={p.place} className={`major-prize place-${Math.min(p.place, 4)}`}>
                <span className="major-place">{ordinal(p.place)}</span>
                <span className="major-prize-text">{p.prize}</span>
                {w && <span className="major-winner" title={w.name}><Dot color={w.color} />{shortName(w.name, 20)} · {w.points} {w.points === 1 ? "point" : "points"}</span>}
                {leader && <span className="major-winner" title={leader.name}>Right now: <Dot color={leader.color} />{shortName(leader.name, 16)}</span>}
              </li>
            );
          })}
        </ol>
        {ended && m.winners.length > 0 && <p className="note">Winners get an email from start.ng at the address on their account, with how to collect the prize.</p>}
        {ended && m.winners.length === 0 && <p className="note">Nobody scored, so there are no winners.</p>}
      </section>

      <section aria-labelledby="major-games">
        <div className="major-head">
          <h2 id="major-games" className="private-heading">The games <span className="count">{total}</span></h2>
          {m.entered && !m.removed && m.state === "running" && (
            <div className="chips" role="group" aria-label="Which games to show">
              <button type="button" className={show === "all" ? "on" : ""} aria-pressed={show === "all"} onClick={() => setShow("all")}>All</button>
              <button type="button" className={show === "todo" ? "on" : ""} aria-pressed={show === "todo"} onClick={() => setShow("todo")}>Not played ({total - m.played})</button>
              <button type="button" className={show === "done" ? "on" : ""} aria-pressed={show === "done"} onClick={() => setShow("done")}>Played ({m.played})</button>
            </div>
          )}
        </div>
        {games.length === 0 && <p className="empty">{show === "todo" ? "You've played every game. Now beat your scores." : "You haven't played any yet. Pick one from All."}</p>}
        <div className="grid tournament-games major-games">
          {games.map((g) => {
            const first = g.leaderboard[0];
            return (
              <article key={g.name} className="game">
                <a className="game-link" href={`/games/${g.name}`}>
                  <div className="art">{g.cover_url ? <img src={g.cover_url} alt="" loading="lazy" decoding="async" /> : <span>{g.name.charAt(0).toUpperCase()}</span>}</div>
                  <div className="info">
                    <h3>{gameTitle(g.name)}</h3>
                    <p title={`Ranked by ${first.label.toLowerCase()}`}>{g.players} {g.players === 1 ? "player" : "players"}</p>
                  </div>
                </a>
                <ol className="tournament-top">
                  {g.top.length === 0 && <li className="none">{m.state === "upcoming" ? "Opens when it starts." : "No scores yet. Be the first."}</li>}
                  {g.top.slice(0, 3).map((r) => (
                    <li key={r.player_id} className={r.player_id === playerId ? "me" : ""}>
                      <span className="nm" title={r.name}><Dot color={r.color} />{shortName(r.name)}</span>
                      <span className="sc">{formatStat(first, r.stats[first.key])}</span>
                    </li>
                  ))}
                </ol>
                {g.mine && g.mine.rank > 3 && (
                  <p className="major-mine">You: #{g.mine.rank} · {formatStat(first, g.mine.stats[first.key])} · {g.mine.points} {g.mine.points === 1 ? "pt" : "pts"}</p>
                )}
                {!ended && <div className="meta"><a className="play" href={g.url} target="_blank" rel="noreferrer">{m.state === "upcoming" ? "Practise ↗" : g.mine ? "Play again ↗" : "Play ↗"}</a></div>}
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="major-standings">
        <h2 id="major-standings" className="private-heading">Standings</h2>
        {m.standings.length === 0 ? (
          <p className="board-empty">{m.state === "upcoming" ? "The table opens when the major starts." : "No points yet. Enter, play one of the games above and you'll show up here."}</p>
        ) : (
          <div className="board-table overall-board major-standings" role="table" aria-label="Standings">
            <div className="board-row board-head" role="row">
              <span role="columnheader">#</span>
              <span role="columnheader">Player</span>
              <span role="columnheader" className="num">Games</span>
              <span role="columnheader" className="num">Firsts</span>
              <span role="columnheader" className="num">Points</span>
            </div>
            {rows.map((s) => (
              <div key={s.player_id} role="row" className={`board-row ${s.player_id === playerId ? "me" : ""} ${s.place <= top ? "in-prizes" : ""}`}>
                <span className="rk">{s.place}</span>
                <span className="nm" title={s.name}><Dot color={s.color} />{shortName(s.name)}{s.player_id === playerId && <em> (you)</em>}{s.place <= top && <span className="major-prize-tag">{ended ? "Winner" : "Prize place"}</span>}</span>
                <span className="num">{s.games_played}</span>
                <span className="num">{s.firsts}</span>
                <span className="num sc">{s.points}</span>
              </div>
            ))}
            {m.me && !rows.some((s) => s.player_id === m.me!.player_id) && (
              <div role="row" className="board-row me">
                <span className="rk">{m.me.place}</span>
                <span className="nm"><Dot color={m.me.color} />{shortName(m.me.name)}<em> (you)</em></span>
                <span className="num">{m.me.games_played}</span>
                <span className="num">{m.me.firsts}</span>
                <span className="num sc">{m.me.points}</span>
              </div>
            )}
          </div>
        )}
        {m.standings.length > 10 && (
          <button type="button" className="link major-more" onClick={() => setAllRows(!allRows)}>{allRows ? "Show the top 10" : `Show all ${m.standings.length} players`}</button>
        )}
      </section>

      <section className="major-about" aria-labelledby="major-about">
        <div>
          <h2 id="major-about" className="private-heading">About {m.partner.name}</h2>
          {m.about && <p>{m.about}</p>}
        </div>
        {m.cta_label && m.cta_url && <a className="btn" href={m.cta_url} target="_blank" rel="noreferrer">{m.cta_label} ↗</a>}
      </section>

      <section aria-labelledby="major-rules">
        <h2 id="major-rules" className="private-heading">How it works</h2>
        <ul className="major-rules">
          <li>Enter with your start.ng account. It's free, and one account per person.</li>
          <li>Each game gives 10 points for 1st, 7 for 2nd, 5 for 3rd, 3 for 4th and 1 for everyone else who plays it. Most points wins.</li>
          <li>Only runs you make after entering, between the start and the end, count. Your best run in each game is kept.</li>
          <li>If two players have the same points, the one who won more games is ahead, then whoever got there first.</li>
          <li>start.ng checks the scores. A score a game can't really give, or a second account, is taken out.</li>
          <li>Prizes come from {m.partner.name}. Winners are emailed at the address on their start.ng account.</li>
        </ul>
      </section>
    </section>
  );
}
