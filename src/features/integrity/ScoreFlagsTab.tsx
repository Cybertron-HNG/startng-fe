// The "Score flags" tab on start.ng/admin: runs held back for looking too good to be true (startng-be app/features/integrity).
// The API checks the scores.review permission; the registry only shows the tab to admins who have it.
import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminTabProps } from "../registry";
import { flagsApi, type Flag, type FlagStatus } from "./api";
import { gameTitle as titleOf } from "../../gameTitle";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");
const STATUSES: [FlagStatus, string][] = [["open", "Waiting"], ["cleared", "Cleared"], ["confirmed", "Kept out"]];
const EMPTY: Record<FlagStatus, string> = {
  open: "Nothing waiting. All clear.",
  cleared: "No runs cleared yet.",
  confirmed: "No runs kept out yet.",
};
const statLine = (stats: Record<string, number>) => Object.entries(stats).map(([k, v]) => `${k} ${v.toLocaleString()}`).join(" · ");

export default function ScoreFlagsTab({ ask }: AdminTabProps) {
  const [status, setStatus] = useState<FlagStatus>("open");
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const latest = useRef(0); // the newest request: an older one that lands late must not replace the list or the error

  const load = useCallback(() => {
    const id = ++latest.current;
    setError("");
    flagsApi.list(status)
      .then((rows) => { if (id === latest.current) setFlags(rows); })
      .catch((e) => { if (id === latest.current) setError(e instanceof Error ? e.message : "Couldn't load this"); });
  }, [status]);
  useEffect(() => { setFlags(null); load(); }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try { await fn(); load(); } catch (e) { setError(e instanceof Error ? e.message : "That didn't work"); } finally { setBusy(false); }
  }

  async function clear(f: Flag) {
    const note = await ask({
      title: `Clear ${f.player}'s run?`,
      body: <>The run is genuine. It counts from now on: it can become {f.player}'s best score on {titleOf(f.game)}'s board, and it counts toward their progress. A tournament that already finished isn't redone.</>,
      confirm: "Clear run",
      input: { label: "Note (optional)", placeholder: "e.g. Watched the replay, it's legit" },
    });
    if (note !== null) act(() => flagsApi.clear(f.id, note));
  }

  async function keepOut(f: Flag) {
    const note = await ask({
      title: `Keep ${f.player}'s run out?`,
      body: <>The run isn't genuine. It stays off the board and out of tournaments for good. This can't be undone.</>,
      confirm: "Keep it out", danger: true,
      input: { label: "Note (optional)", placeholder: "e.g. A time of 5 seconds isn't possible" },
    });
    if (note !== null) act(() => flagsApi.confirm(f.id, note));
  }

  return (
    <section>
      <h2>Score flags</h2>
      <p className="note">A run that looks too good to be true is held back. It isn't on the board or in any tournament, and earns nothing, until an admin decides. The player isn't told.</p>
      <div className="chips" role="group" aria-label="Show">
        {STATUSES.map(([s, label]) => (
          <button key={s} type="button" className={status === s ? "on" : ""} aria-pressed={status === s} onClick={() => setStatus(s)}>{label}</button>
        ))}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {flags === null && !error && <p className="note">Loading…</p>}
      {flags && flags.length === 0 && !error && <p className="empty">{EMPTY[status]}</p>}
      <div className="admin-list flags-list">
        {flags?.map((f) => (
          <article key={f.id} className="admin-item">
            <div className="admin-item-head">
              <div className="admin-item-title">
                <h3><a href={`/games/${f.game}`} target="_blank" rel="noreferrer">{titleOf(f.game)}</a>
                  <span className={`pill ${f.status}`}>{f.status === "confirmed" ? "kept out" : f.status}</span></h3>
                <p className="note">{f.player} · {when(f.created_at)}</p>
              </div>
              {f.status === "open" && (
                <div className="row-actions">
                  <button type="button" className="ghost small" disabled={busy} onClick={() => clear(f)}>Clear</button>
                  <button type="button" className="danger small" disabled={busy} onClick={() => keepOut(f)}>Keep out</button>
                </div>
              )}
            </div>
            <ul className="admin-reports">
              <li><div><b>Why it was held:</b> {f.reason}</div></li>
              <li><div><b>The run:</b> {statLine(f.stats)}{f.previous_best !== null && <span className="note"> · their best before: {f.previous_best.toLocaleString()}</span>}</div></li>
              {f.status !== "open" && (
                <li><div className="note">{f.status === "cleared" ? "Cleared" : "Kept out"} by {f.reviewed_by ?? "an admin"}, {when(f.reviewed_at)}{f.note ? `: ${f.note}` : ""}</div></li>
              )}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
