import { useEffect, useState } from "react";
import type { YourGameProps } from "../registry";
import { getDashboard, type Dashboard, type GameStats } from "./api";
import "./creator_hub.css";

// The creator dashboard, inside Your games: each game's numbers under its card. Aggregates only (never who played).
// One request serves every game on the page.
let pending: Promise<Dashboard> | null = null;
let fetchedAt = 0;
const load = () => {
  if (!pending || Date.now() - fetchedAt > 60_000) {
    fetchedAt = Date.now();
    pending = getDashboard().catch((e) => { pending = null; throw e; });
  }
  return pending;
};

function Trend({ stats }: { stats: GameStats }) {
  const max = Math.max(1, ...stats.trend.map((t) => t.plays));
  return (
    <span className="trend" role="img" aria-label={`Plays per day, last 30 days: ${stats.plays_30} in total`}>
      {stats.trend.map((t) => <i key={t.day} style={{ height: `${Math.max(6, (t.plays / max) * 100)}%` }} title={`${t.day}: ${t.plays}`} />)}
    </span>
  );
}

const length = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);

export default function YourStats({ game }: YourGameProps) {
  const [dash, setDash] = useState<Dashboard | null>(null);
  useEffect(() => {
    let live = true;
    load().then((d) => live && setDash(d)).catch(() => {});
    return () => { live = false; };
  }, []);
  const s = dash?.games.find((g) => g.game === game.name);
  if (!dash || !s) return null;
  return (
    <details className="your-stats">
      <summary className="your-stats-head">
        <b>How it's doing</b>
        {dash.best_game === s.game && <span className="tag">Best this month</span>}
        <span className="note">{s.plays_7.toLocaleString()} {s.plays_7 === 1 ? "play" : "plays"} this week{s.change_7 !== 0 && ` (${s.change_7 > 0 ? "+" : ""}${s.change_7})`}</span>
      </summary>
      <dl>
        <div><dt>Plays, 7 days</dt><dd>{s.plays_7.toLocaleString()}</dd></div>
        <div><dt>Plays, 30 days</dt><dd>{s.plays_30.toLocaleString()}</dd></div>
        <div><dt>From embeds</dt><dd>{(s.embed_plays_30 ?? 0).toLocaleString()}</dd></div>
        <div><dt>All time</dt><dd>{s.plays_all.toLocaleString()}</dd></div>
        <div><dt>People, 30 days</dt><dd>{s.visitors_30.toLocaleString()}</dd></div>
        <div><dt>Players who scored</dt><dd>{s.players_30.toLocaleString()}</dd></div>
        <div><dt>Came back</dt><dd>{s.repeat_players_30.toLocaleString()}</dd></div>
        <div><dt>Scores sent</dt><dd>{s.runs_30.toLocaleString()}</dd></div>
        <div><dt>Average session</dt><dd>{s.avg_session_seconds === null ? "unknown" : length(s.avg_session_seconds)}</dd></div>
      </dl>
      {s.embed_plays_30 != null && s.embed_plays_30 > 0 && (
        <p className="note">{s.embed_plays_30.toLocaleString()} plays from embeds this month</p>
      )}
      <Trend stats={s} />
      {s.avg_session_seconds === null && <p className="note">Session length shows for games that use the start.ng Kit.</p>}
    </details>
  );
}
