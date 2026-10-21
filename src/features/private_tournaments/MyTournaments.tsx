import { useEffect, useState } from "react";
import type { PageProps } from "../registry";
import { listGames, PublishedGame } from "../../api";
import { PAGES, setSeo } from "../../seo";
import { getCrew } from "../crews/api";
import { createTournament, myTournaments, Summary } from "./api";
import { timeLeft } from "./time";

const DURATIONS: [string, number][] = [["1 day", 24], ["3 days", 72], ["1 week", 168], ["2 weeks", 336], ["1 month", 720]];
const MAX_GAMES = 5;

/** start.ng/t: your tournaments with friends, and a form to start one. */
export default function MyTournaments({ user, onSignIn }: PageProps) {
  const [mine, setMine] = useState<Summary[] | null>(null);
  const [games, setGames] = useState<PublishedGame[]>([]);
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [hours, setHours] = useState(168);
  const [query, setQuery] = useState("");
  // /friends?crew=12: a tournament for one of your crews (its members find it on the crew page)
  const crewId = Number(new URLSearchParams(location.search).get("crew")) || null;
  const [crewName, setCrewName] = useState("");
  useEffect(() => {
    if (crewId && user) getCrew(crewId).then((c) => setCrewName(c.name)).catch(() => setCrewName(""));
  }, [crewId, user?.id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setSeo(PAGES.friendsTournaments), []);
  useEffect(() => {
    listGames().then((all) => setGames(all.filter((g) => g.name !== "hangout"))).catch(() => setGames([]));
  }, []);
  useEffect(() => {
    if (!user) { setMine([]); return; }
    myTournaments().then(setMine).catch(() => setMine([]));
  }, [user?.id]);

  const shown = games.filter((g) => g.name.replace(/-/g, " ").includes(query.trim().toLowerCase()));
  const toggle = (name: string) =>
    setPicked((p) => (p.includes(name) ? p.filter((n) => n !== name) : p.length < MAX_GAMES ? [...p, name] : p));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return onSignIn();
    setBusy(true);
    setError("");
    try {
      const t = await createTournament({ title, games: picked, hours, ...(crewId && crewName ? { crew_id: crewId } : {}) });
      location.assign(`/friends/${t.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the tournament");
      setBusy(false);
    }
  }

  return (
    <section className="container tournament-page">
      <div className="section-head">
        <div>
          <h1>Tournament with friends</h1>
          <p className="tournament-sub">Pick up to {MAX_GAMES} games and how long it runs, send the link, and see how everyone scores. <a href="/tournament">Today's tournament →</a></p>
        </div>
      </div>

      <form className="private-form" onSubmit={submit}>
        {crewName && <p className="note">For your crew <b>{crewName}</b>. Its members will find it on the crew page.</p>}
        <label className="field">
          <span>Name</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={60} required placeholder="e.g. Family Cup" />
        </label>
        <fieldset className="field private-games">
          <span>Pick up to {MAX_GAMES} games ({picked.length} picked, {games.length} to choose from)</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search games" aria-label="Search games" />
          {games.length === 0 && <p className="board-sub">Loading games…</p>}
          {games.length > 0 && shown.length === 0 && <p className="board-sub">No game matches “{query}”.</p>}
          <div className="private-game-list">
            {shown.map((g) => (
              <label key={g.name} className={picked.includes(g.name) ? "on" : ""}>
                <input type="checkbox" checked={picked.includes(g.name)} disabled={!picked.includes(g.name) && picked.length >= MAX_GAMES} onChange={() => toggle(g.name)} />
                <span className="thumb">{g.cover_url ? <img src={g.cover_url} alt="" loading="lazy" decoding="async" /> : g.name.charAt(0).toUpperCase()}</span>
                <span className="gname">{g.name.replace(/-/g, " ")}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <span>How long</span>
          <div className="segmented" role="group" aria-label="How long it runs">
            {DURATIONS.map(([label, h]) => (
              <button key={h} type="button" className={hours === h ? "on" : ""} aria-pressed={hours === h} onClick={() => setHours(h)}>{label}</button>
            ))}
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="private-submit">
          <button type="submit" disabled={busy || (!!user && picked.length === 0)}>{!user ? "Sign in to start" : busy ? "Starting…" : "Start tournament"}</button>
          <p className="note">It starts as soon as you tap the button. Scores count from the moment each player joins.</p>
        </div>
      </form>

      <section aria-labelledby="mine-heading">
        <h2 id="mine-heading" className="private-heading">Your tournaments</h2>
        {mine === null && <p className="board-sub">Loading…</p>}
        {mine?.length === 0 && <p className="board-empty">{user ? "None yet. Start one above, or open a friend's invite link." : "Sign in to see yours."}</p>}
        <ul className="private-list">
          {mine?.map((t) => (
            <li key={t.code}>
              <a href={`/friends/${t.code}`}>
                <b>{t.title}</b>
                <span>{t.games.length} {t.games.length === 1 ? "game" : "games"} · {t.members} {t.members === 1 ? "player" : "players"}</span>
              </a>
              <span className={`tag ${t.finished ? "done" : ""}`}>{timeLeft(t.ends_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
