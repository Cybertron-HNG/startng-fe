import { useCallback, useEffect, useRef, useState } from "react";
import { analytics } from "./analytics";
import {
  enterTournament, getTournament, OverallEntry, overallLeaderboard, recentTournaments, Standing, Tournament, TournamentGame,
  TournamentSummary, User, getTournamentResult
} from "./api";
import { formatStat, shortName } from "./BoardTable";
import { useFeature } from "./features/flags";
import PageParts from "./features/PageParts";
import { Game, toCard } from "./games";
import { PAGES, setSeo, TOURNAMENT_IMAGE } from "./seo";
import ShareButton from "./features/share_cards/ShareButton";
import { withHandle } from "./share";

// Daily tournaments (startng-be app/tournaments.py): every day 5 random games for 24 hours, ending at 18:00
// Nigeria time. Sharing on X enters you; your runs on those games count, and places give points
// (10, 7, 5, 3, then 1). Most points wins the day, and the overall leaderboard adds the points up.

const POINTS_NOTE = "1st on a game gets 10 points, 2nd 7, 3rd 5, 4th 3, and everyone else who plays it 1.";
const ENTER_DELAY_MS = 2500; // a moment to post the share before entry unlocks (we can't check the post)

/** The tournament picture as a file, for phones that can attach it to a post (Web Share API), else null. */
async function shareImageFile(): Promise<File | null> {
  // Phones and tablets only: on computers the share window is the system's, not X, so they go straight to X.
  if (typeof navigator.canShare !== "function" || !matchMedia("(pointer: coarse)").matches) return null;
  try {
    const blob = await fetch(TOURNAMENT_IMAGE).then((r) => (r.ok ? r.blob() : Promise.reject(new Error("no image"))));
    const file = new File([blob], "startng-tournament.png", { type: "image/png" });
    return navigator.canShare({ files: [file] }) ? file : null;
  } catch {
    return null;
  }
}

const token = () => localStorage.getItem("token");

/** Today's tournament for the signed-in player (null: none today; undefined: still loading). */
export function useTournament(user: User | null, active: boolean) {
  const [tournament, setTournament] = useState<Tournament | null | undefined>(undefined);
  const [error, setError] = useState("");
  const refresh = useCallback(() => {
    getTournament(token())
      .then((t) => { setTournament(t); setError(""); })
      .catch(() => setError("Couldn't load today's tournament. Try again in a moment."));
  }, []);
  useEffect(() => {
    if (!active) return;
    refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 30000);
    return () => window.clearInterval(timer);
  }, [active, refresh, user?.id]);
  return { tournament, setTournament, error, refresh };
}

/** "5h 12m left", ticking every half minute. */
function useTimeLeft(endsAt: string | undefined) {
  const left = useCountdown(endsAt);
  return left === null ? "" : left === "" ? "ending now" : `${left} left`;
}

/** "5h 12m" until a moment ("" once it's here, null with no moment), ticking every half minute. */
function useCountdown(at: string | null | undefined): string | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  if (!at) return null;
  const ms = Math.max(0, new Date(at).getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return ms === 0 ? "" : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** "Next tournament starts in 5h 12m" while today's runs. Its games are a surprise until it starts. */
function NextTournament({ at }: { at: string | null }) {
  const left = useCountdown(at);
  if (!at || left === null) return null;
  return (
    <p className="tournament-next">
      Next tournament {left ? <>starts in <b>{left}</b></> : "starts now"} · {dayText(at)}, {endsAtText(at)} your time. New games, revealed when it starts.
    </p>
  );
}

const endsAtText = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const dayText = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

/** A tournament game as a card (title and colours worked out the same way as every other card). */
function cardOf(g: TournamentGame): Game {
  return toCard({ name: g.name, url: g.url, repo_url: "", by: "", updated_at: "", cover_url: g.cover_url, leaderboard: g.leaderboard, description: g.description });
}

function Dot({ color }: { color: string | null }) {
  return <span className="dot" style={{ background: color ?? "var(--line)" }} />;
}

/** The homepage strip: today's games, time left and a way in. */
export function TournamentBanner({ tournament }: { tournament: Tournament | null | undefined }) {
  const left = useTimeLeft(tournament?.ends_at);
  if (!tournament) return null;
  return (
    <section className="container">
      <a className="tournament-banner" href="/tournament">
        <div>
          <p className="eyebrow">Today's tournament · {left}</p>
          <h2>{tournament.games.length} games. 24 hours. One winner.</h2>
          <p className="tournament-banner-sub">
            Share to enter, then play. {tournament.entrants} {tournament.entrants === 1 ? "player has" : "players have"} entered.
          </p>
          <NextTournament at={tournament.next_starts_at} />
        </div>
        <div className="tournament-banner-games" aria-hidden="true">
          {tournament.games.map((g) => {
            const c = cardOf(g);
            return (
              <span key={g.name} className="art" style={{ background: `linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})` }}>
                {c.cover ? <img src={c.cover} alt="" loading="lazy" decoding="async" /> : <span>{c.title.charAt(0)}</span>}
              </span>
            );
          })}
        </div>
        <span className="btn">See the tournament →</span>
      </a>
    </section>
  );
}

function StandingsTable({ rows, playerId, label }: { rows: Standing[]; playerId: number | null; label: string }) {
  const cols = "36px minmax(0, 1fr) auto auto";
  return (
    <div className="board-table" role="table" aria-label={label} style={{ gridTemplateColumns: cols }}>
      <div className="board-row board-head" role="row">
        <span role="columnheader">#</span>
        <span role="columnheader">Player</span>
        <span role="columnheader" className="num">Firsts</span>
        <span role="columnheader" className="num">Points</span>
      </div>
      {rows.map((s) => (
        <div key={s.player_id} role="row" className={`board-row ${s.player_id === playerId ? "me" : ""}`}>
          <span className="rk">{s.place}</span>
          <span className="nm" title={s.name}><Dot color={s.color} />{shortName(s.name)}{s.player_id === playerId && <em> (you)</em>}</span>
          <span className="num">{s.firsts}</span>
          <span className="num sc">{s.points}</span>
        </div>
      ))}
    </div>
  );
}

/** start.ng/tournament: today's games, entering, live standings and past winners. */
export function TournamentPage({ user, state, onSignIn, onPlay }: {
  user: User | null;
  state: ReturnType<typeof useTournament>;
  onSignIn: () => void;
  onPlay: (e: React.MouseEvent, g: Game) => void;
}) {
  const { tournament: t, setTournament, error } = state;
  const [past, setPast] = useState<TournamentSummary[] | null>(null);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState("");
  const left = useTimeLeft(t?.ends_at);
  const playerId = user?.id ?? null;
  const withFriends = useFeature("private_tournaments"); // tournaments with friends (src/features/private_tournaments)

  // State for the results modal
  const [pastResult, setPastResult] = useState<Tournament | null>(null);

  useEffect(() => setSeo(PAGES.tournament), []);
  // Ready before the click, so sharing the picture still counts as part of the tap (browsers require that).
  const imageFile = useRef<File | null>(null);
  useEffect(() => {
    shareImageFile().then((file) => { imageFile.current = file; });
  }, []);
  useEffect(() => {
    recentTournaments(7).then(setPast).catch(() => setPast([]));
  }, [t?.id]);

  function shareAndEnter() {
    if (!user) {
      onSignIn();
      return;
    }
    if (!t) return;
    const text = `I'm in today's start.ng tournament: ${t.games.length} games, 24 hours, one winner. Come and play!`;
    const url = `${location.origin}/tournament`;
    const id = t.id;
    const enter = (delay: number) => {
      setEntering(true);
      setEnterError("");
      window.setTimeout(() => {
        enterTournament(token())
          .then((next) => { analytics.enterTournament(next.id); setTournament(next); })
          .catch((err) => setEnterError(err instanceof Error ? err.message : "Could not enter the tournament"))
          .finally(() => setEntering(false));
      }, delay);
    };
    // Phones: the share menu, with the tournament picture attached (pick X there). Sharing it enters you.
    const file = imageFile.current;
    if (file) {
      navigator
        .share({ files: [file], text: `${text} ${url}` })
        .then(() => { analytics.share("tournament", String(id), "x"); enter(0); })
        .catch((err) => { if (err?.name !== "AbortError") openTweet(); }); // cancelled: not entered
      return;
    }
    openTweet();

    // Computers (and phones that can't share files): X's post page. The link shows the picture as its preview card.
    function openTweet() {
      window.open(`https://twitter.com/intent/tweet?${new URLSearchParams({ text: withHandle(text), url })}`, "_blank", "noopener,noreferrer");
      analytics.share("tournament", String(id), "x");
      enter(ENTER_DELAY_MS);
    }
  }

  return (
    <section className="container tournament-page">
      <div className="section-head">
        <div>
          <h1>Today's tournament</h1>
          <p className="tournament-sub">
            A few games, 24 hours, one winner. <a href="/leaderboard">Overall leaderboard →</a>
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {t === undefined && !error && <p className="board-sub">Loading…</p>}
      {t === null && (
        <p className="empty">No tournament today: there aren't enough games with leaderboards yet. Check back tomorrow.</p>
      )}
      {t === null && <PageParts page="tournament" user={user} onSignIn={onSignIn} />}

      {t && (
        <>
          <div className="tournament-status">
            <div>
              <span className="tag">{left}</span>
              <p>
                Ends at <b>{endsAtText(t.ends_at)}</b> your time. {t.entrants} {t.entrants === 1 ? "player has" : "players have"} entered.
              </p>
              <p className="note">{POINTS_NOTE} Most points wins the day.</p>
              <NextTournament at={t.next_starts_at} />
            </div>
            <div className="tournament-enter">
              {t.entered ? (
                <>
                  <p className="ok">You're in. Your runs on these games count until the end.</p>
                  {t.me && <p className="note">You're <b>#{t.me.place}</b> with <b>{t.me.points}</b> {t.me.points === 1 ? "point" : "points"}.</p>}
                </>
              ) : (
                <>
                  <button type="button" onClick={shareAndEnter} disabled={entering}>
                    {entering ? "Entering…" : user ? "Share on X to enter" : "Sign in to enter"}
                  </button>
                  <p className="note">Share the tournament on X to enter. Runs before you enter don't count.</p>
                </>
              )}
              {enterError && <p className="error">{enterError}</p>}
            </div>
          </div>

          <div className="grid tournament-games">
            {t.games.map((g) => {
              const c = cardOf(g);
              return (
                <article key={g.name} className="game">
                  <a className="game-link" href={`/games/${g.name}`}>
                    <div className="art" style={{ background: `linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})` }}>
                      {c.cover ? <img src={c.cover} alt="" loading="lazy" decoding="async" /> : <span>{c.title.charAt(0)}</span>}
                    </div>
                    <div className="info">
                      <h3>{c.title}</h3>
                      <p>{g.players} {g.players === 1 ? "player" : "players"}</p>
                    </div>
                  </a>
                  <ol className="tournament-top">
                    {g.top.length === 0 && <li className="none">No runs yet. Be the first.</li>}
                    {g.top.map((r) => (
                      <li key={r.player_id} className={r.player_id === playerId ? "me" : ""}>
                        <span className="nm" title={r.name}><Dot color={r.color} />{shortName(r.name)}</span>
                        <span className="sc">{formatStat(g.leaderboard[0], r.stats[g.leaderboard[0].key])}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="meta">
                    <a className="play" href={c.url} target="_blank" rel="noreferrer" onClick={(e) => onPlay(e, c)}>Play ↗</a>
                  </div>
                </article>
              );
            })}
          </div>

          <PageParts page="tournament" user={user} onSignIn={onSignIn} />

          <div className="tournament-columns">
            <section aria-labelledby="standings-heading">
              <h2 id="standings-heading">Standings</h2>
              {t.standings.length === 0 ? (
                <p className="board-empty">No points yet. Enter, play, and you'll show up here.</p>
              ) : (
                <StandingsTable rows={t.standings} playerId={playerId} label="Today's standings" />
              )}
            </section>
            <section aria-labelledby="winners-heading">
              <h2 id="winners-heading">Past winners</h2>
              {/* Your card from the last tournament (share cards, src/features/share_cards); hidden if you didn't play it */}
              {user && past?.[0] && (
                <ShareButton kind="tournament_result" id={`${past[0].id}-${user.id}`} label="Share my result"
                  intro={<>Your result on {dayText(past[0].ends_at)}</>} />
              )}
              {past === null && <p className="board-sub">Loading…</p>}
              {past?.length === 0 && <p className="board-empty">The first winner is named when today's tournament ends.</p>}
              {past && past.length > 0 && (
                <ul className="winners">
                  {past.map((p) => (
                    <li key={p.id}>
                      <button 
                        type="button" 
                        className="link" 
                        style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} 
                        onClick={() => getTournamentResult(p.id).then(setPastResult)}
                      >
                        <span className="when">{dayText(p.ends_at)}</span>
                        {p.winner ? (
                          <span className="nm"><Dot color={p.winner.color} /><b title={p.winner.name}>{shortName(p.winner.name)}</b> · {p.winner.points} pts</span>
                        ) : (
                          <span className="nm none">No one played</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

        {withFriends && (
          <aside className="friends-card">
            <div>
              <h2>Play with your friends</h2>
              <p>Make your own tournament: pick any games, set how long it runs, and send the link. Only the friends you invite are in it.</p>
            </div>
            <a className="btn" href="/friends">Start a tournament</a>
          </aside>
        )}

      {/* The Results Modal */}
      {pastResult && (
        <div className="overlay" onClick={() => setPastResult(null)}>
          <div className="card" style={{ maxWidth: 600, maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <h3>Results: {new Date(pastResult.starts_at).toLocaleDateString()}</h3>
              <button className="link close" onClick={() => setPastResult(null)}>✕</button>
            </div>
            <h4>Final Standings</h4>
            {pastResult.standings.map((st) => (
              <div key={st.player_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--line)' }}>
                <span>#{st.place} {st.name}</span>
                <span>{st.points} pts</span>
              </div>
            ))}
            <h4 style={{ marginTop: 20 }}>Games Played</h4>
            {pastResult.games.map((g) => (
              <div key={g.name} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <strong>{g.name}</strong> ({g.players} players)
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** start.ng/leaderboard: tournament points added up, all time or this week. */
export function LeaderboardPage({ user }: { user: User | null }) {
  const [period, setPeriod] = useState<"all" | "week">(() => (new URLSearchParams(location.search).get("period") === "week" ? "week" : "all"));
  const [rows, setRows] = useState<OverallEntry[] | null>(null);
  const [error, setError] = useState("");
  const playerId = user?.id ?? null;

  // This week's is its own address, as nginx serves it (see nginx.conf).
  useEffect(() => setSeo({ ...PAGES.leaderboard, path: period === "week" ? "/leaderboard?period=week" : PAGES.leaderboard.path }), [period]);
  useEffect(() => {
    setRows(null);
    setError("");
    overallLeaderboard(period, 50).then(setRows).catch(() => setError("Couldn't load the leaderboard. Try again in a moment."));
  }, [period]);

  function choose(next: "all" | "week") {
    setPeriod(next);
    history.replaceState(null, "", next === "week" ? "/leaderboard?period=week" : "/leaderboard");
  }

  const cols = "36px minmax(0, 1fr) auto auto auto";
  return (
    <section className="container tournament-page">
      <div className="section-head">
        <div>
          <h1>Leaderboard</h1>
          <p className="tournament-sub">Points from the daily tournaments. <a href="/tournament">Today's tournament →</a></p>
        </div>
      </div>
      <div className="segmented" role="group" aria-label="Period">
        <button type="button" className={period === "all" ? "on" : ""} aria-pressed={period === "all"} onClick={() => choose("all")}>All time</button>
        <button type="button" className={period === "week" ? "on" : ""} aria-pressed={period === "week"} onClick={() => choose("week")}>This week</button>
      </div>
      {error && <p className="error">{error}</p>}
      {!error && rows === null && <p className="board-sub">Loading…</p>}
      {rows?.length === 0 && (
        <p className="board-empty">No points {period === "week" ? "this week" : "yet"}. They come from the daily tournament: <a href="/tournament">enter today's</a>.</p>
      )}
      {rows && rows.length > 0 && (
        <div className="board-table overall-board" role="table" aria-label="Overall leaderboard" style={{ gridTemplateColumns: cols }}>
          <div className="board-row board-head" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">Player</span>
            <span role="columnheader" className="num">Days won</span>
            <span role="columnheader" className="num">Firsts</span>
            <span role="columnheader" className="num">Points</span>
          </div>
          {rows.map((r) => (
            <div key={r.player_id} role="row" className={`board-row ${r.player_id === playerId ? "me" : ""}`}>
              <span className="rk">{r.rank}</span>
              <span className="nm" title={r.name}><Dot color={r.color} />{shortName(r.name)}{r.player_id === playerId && <em> (you)</em>}</span>
              <span className="num">{r.wins}</span>
              <span className="num">{r.firsts}</span>
              <span className="num sc">{r.points}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}