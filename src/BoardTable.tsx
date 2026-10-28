import { useEffect, useState } from "react";
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
  // One set of columns for the whole table (see .board-table), so every number sits under its heading.
  const cols = `28px minmax(0, 1fr) ${stats.map(() => "auto").join(" ")}`;

  const [saves, setSaves] = useState(0);
  useEffect(() => {
    getLeaderboard(game.slug, 10)
      .then((rows) => setEntries(rows.slice(0, 10)))
      .catch(() => setError("Couldn't load the leaderboard. Try again in a moment."));
  }, [game.slug, saves]);

  // The game is playing on this page (src/features/play_here) and just saved a score: show the new table.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === location.origin && e.data?.type === "startng:scoreSaved" && e.data.game === game.slug) setSaves((n) => n + 1);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [game.slug]);

  return (
    <>
      {error && <p className="error">{error}</p>}
      {!error && entries === null && <p className="board-sub">Loading…</p>}
      {entries?.length === 0 && <p className="board-empty">No scores yet. Play it and be the first.</p>}
      {entries && entries.length > 0 && (
        <div className="board-table" role="table" aria-label={`${game.title} leaderboard`} style={{ gridTemplateColumns: cols }}>
          <div className="board-row board-head" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">Player</span>
            {stats.map((s) => <span key={s.key} role="columnheader" className="num">{s.label}</span>)}
          </div>
          {entries.map((e) => (
            <div key={e.player_id} role="row" className={`board-row ${e.player_id === playerId ? "me" : ""}`}>
              <span className="rk">{e.rank}</span>
              <span className="nm" title={e.name}>
                <span className="dot" style={{ background: e.color ?? "var(--line)" }} />
                {profilesOn ? <a className="player-link" href={`/p/${e.player_id}`}>{shortName(e.name)}</a> : shortName(e.name)}
                {e.player_id === playerId && <em> (you)</em>}
              </span>
              {stats.map((s) => <span key={s.key} className="num sc">{formatStat(s, e.stats?.[s.key] ?? (s.key === "score" ? e.score : null))}</span>)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
