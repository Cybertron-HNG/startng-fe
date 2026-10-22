import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AdminTabProps } from "../registry";
import { adminSpotlight, clearGameOfTheWeek, pickGameOfTheWeek, type AdminSpotlight } from "./api";

// start.ng/admin#spotlight: choose the Game of the Week (PRD A2). The daily challenge makes itself from recent scores.
export default function SpotlightTab({ ask }: AdminTabProps) {
  const [data, setData] = useState<AdminSpotlight | null>(null);
  const [error, setError] = useState("");
  const [game, setGame] = useState("");
  const [note, setNote] = useState("");
  const [week, setWeek] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    adminSpotlight().then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!game) return;
    setBusy(true);
    setError("");
    try {
      await pickGameOfTheWeek(game, note.trim(), week);
      setGame(""); setNote(""); setWeek("");
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the pick");
    } finally {
      setBusy(false);
    }
  }

  async function clear(weekStart: string, title: string) {
    const ok = await ask({ title: "Clear this pick?", body: `${title} will no longer be the Game of the Week for the week of ${weekStart}.`, confirm: "Clear", danger: true });
    if (ok === null) return;
    try { await clearGameOfTheWeek(weekStart); reload(); } catch (err) { setError(err instanceof Error ? err.message : "Couldn't clear it"); }
  }

  return (
    <section>
      <h2>Spotlight</h2>
      <p className="note">One Game of the Week, shown on the homepage and in the weekly email. Leave the week empty to pick for this week, or choose any day of a later week to book it.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <form className="spot-form" onSubmit={save}>
        <select value={game} onChange={(e) => setGame(e.target.value)} aria-label="Game">
          <option value="">Choose a game</option>
          {data?.games.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Why this game? (optional)" aria-label="Note" />
        <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} aria-label="Any day of the week" />
        <button type="submit" className="btn" disabled={!game || busy}>Pick</button>
      </form>

      <h3>This week and booked</h3>
      {data && data.picks.length === 0 && <p className="empty">No pick yet. Choose one above.</p>}
      <div className="admin-list">
        {data?.picks.map((p) => (
          <article key={p.week_start} className="admin-item">
            <div className="admin-item-head">
              <div className="admin-item-title">
                <h3><a href={`/games/${p.game}`}>{p.title}</a></h3>
                <p className="note">Week of {p.week_start} · picked by {p.picked_by}{p.note ? ` · ${p.note}` : ""}</p>
              </div>
              <button type="button" className="ghost" onClick={() => clear(p.week_start, p.title)}>Clear</button>
            </div>
          </article>
        ))}
      </div>

      <h3>Today's daily challenge</h3>
      {data?.challenge ? (
        <p className="note">{data.challenge.game_title}: {data.challenge.goal_shown} {data.challenge.stat} or {data.challenge.goal_is_a_ceiling ? "less" : "more"}. It is made from recent scores and changes at midnight Nigeria time.</p>
      ) : (
        <p className="empty">No challenge today: no game has enough recent scores yet.</p>
      )}
    </section>
  );
}
