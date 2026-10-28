import { useEffect, useState, type CSSProperties } from "react";
import { BoardStat, getLeaderboard, LeaderboardEntry } from "./api";
import { useFeature } from "./features/flags";
import { Game } from "./games";

/** A stat as players read it: times as m:ss, numbers with separators, "–" when missing. */
export const formatStat = (stat: BoardStat, v: number | null | undefined) => {
  if (v === null || v === undefined) return "–";
  if (stat.format === "time") return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
  return v.toLocaleString();
};

/** A name as boards show it: whole when it fits, else just the first name (or cut with … if that's long too). */
export const shortName = (name: string, max = 14) => {
  const n = name.trim();
  if (n.length <= max) return n;
  const first = n.split(/\s+/)[0];
  return first.length > max ? `${first.slice(0, max - 1)}…` : first;
};

/** A game's shared leaderboard table: the top players' best scores, saved in start.ng's database.
 *  Used in the leaderboard popup and on the game's own page. */
export default function BoardTable({ game, playerId }: { game: Game; playerId: number | null }) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState("");
  const profilesOn = useFeature("profiles"); // names link to player pages (src/features/profiles)
  // The game's own columns (startng.json); first one ranks, the rest break ties.
  const stats = game.board ?? [{ key: "score", label: "Score", order: "highest" as const, format: "number" as const }];
  // One set of columns for the whole table (see .board-table), so every number sits under its heading. On phones only
  // the first (ranking) column stays; the others go on a line under the name (.game-board-table in styles.css).
  const cols = `28px minmax(0, 1fr) ${stats.map(() => "auto").join(" ")}`;
  const [main, ...extra] = stats;
  const statOf = (e: LeaderboardEntry, s: BoardStat) => formatStat(s, e.stats?.[s.key] ?? (s.key === "score" ? e.score : null));

  useEffect(() => {
    getLeaderboard(game.slug, 10)
      .then((rows) => setEntries(rows.slice(0, 10)))
      .catch(() => setError("Couldn't load the leaderboard. Try again in a moment."));
  }, [game.slug]);

  return (
    <>
      {error && <p className="error">{error}</p>}
      {!error && entries === null && <p className="board-sub">Loading…</p>}
      {entries?.length === 0 && <p className="board-empty">No scores yet. Play it and be the first.</p>}
      {entries && entries.length > 0 && (
        <div className="board-table game-board-table" role="table" aria-label={`${game.title} leaderboard`}
          style={{ "--board-cols": cols } as CSSProperties}>
          <div className="board-row board-head" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">Player</span>
            <span role="columnheader" className="num">{main.label}</span>
            {extra.map((s) => <span key={s.key} role="columnheader" className="num extra">{s.label}</span>)}
          </div>
          {entries.map((e) => (
            <div key={e.player_id} role="row" className={`board-row ${e.player_id === playerId ? "me" : ""}`}>
              <span className="rk">{e.rank}</span>
              <span className="nm" title={e.name}>
                <span className="dot" style={{ background: e.color ?? "var(--line)" }} />
                <span className="nm-body">
                  <span className="nm-name">
                    {profilesOn ? <a className="player-link" href={`/p/${e.player_id}`}>{shortName(e.name)}</a> : shortName(e.name)}
                    {e.player_id === playerId && <em> (you)</em>}
                  </span>
                  {extra.length > 0 && (
                    <span className="nm-extra" aria-hidden="true">{extra.map((s) => `${s.label} ${statOf(e, s)}`).join(" · ")}</span>
                  )}
                </span>
              </span>
              <span className="num sc">{statOf(e, main)}</span>
              {extra.map((s) => <span key={s.key} className="num sc extra">{statOf(e, s)}</span>)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
