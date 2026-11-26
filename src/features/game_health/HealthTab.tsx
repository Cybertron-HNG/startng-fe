import { useCallback, useEffect, useState } from "react";
import type { AdminTabProps } from "../registry";
import { checkAll, checkNow, overview, type Overview } from "./api";
import { gameTitle as titleOf } from "../../gameTitle";

// start.ng/admin#game-health: games that fail their checks. Checks run by themselves about every 20 minutes;
// three failures in a row make a game unhealthy (its owner sees it too).

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "never");
const LABELS: Record<string, string> = { ok: "healthy", failing: "failing", unhealthy: "unhealthy", unchecked: "not checked yet" };

export default function HealthTab({ go, can }: AdminTabProps) {
  const [view, setView] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");

  const reload = useCallback(() => {
    setError("");
    overview().then(setView).catch((e) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);

  async function act(key: string, fn: () => Promise<string>) {
    setBusy(key);
    setError("");
    setNote("");
    try { setNote(await fn()); reload(); } catch (e) { setError(e instanceof Error ? e.message : "That didn't work"); } finally { setBusy(""); }
  }

  return (
    <section>
      <div className="dup-head">
        <div>
          <h2>Game health</h2>
          <p className="note">Every live game is checked about every 20 minutes: its page is there and not blank, the files it loads exist, and its address answers. Three failures in a row make it unhealthy: it's hidden through Needs fixing, and its owner and the super admins are emailed. If many games fail at once, nothing is hidden and super admins get an alert instead.</p>
        </div>
        <button type="button" className="ghost" disabled={!!busy} onClick={() => act("all", async () => {
          await checkAll();
          return "Every game will be checked again over the next few minutes.";
        })}>Check all again</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {note && <p className="ok" role="status">{note}</p>}

      {view && (
        <div className="email-stats">
          {["unhealthy", "failing", "ok", "unchecked"].map((s) => (
            <div key={s}><b>{view.counts[s] ?? 0}</b><span>{LABELS[s]}</span></div>
          ))}
        </div>
      )}

      {view && view.games.length === 0 && <p className="empty">Every checked game is loading fine.</p>}
      <div className="admin-list">
        {view?.games.map((g) => (
          <article key={g.game} className="admin-item">
            <div className="admin-item-head">
              <div className="admin-item-title">
                <h3>
                  <a href={g.url} target="_blank" rel="noreferrer">{titleOf(g.game)}</a>
                  <span className={`pill ${g.status === "unhealthy" ? "reported" : "waiting"}`}>{LABELS[g.status]}</span>
                </h3>
                <p className="note">
                  by {g.owner ?? "unknown"} · failed {g.failures} {g.failures === 1 ? "check" : "checks"} in a row · last checked {when(g.checked_at)}
                  {g.unhealthy_since ? ` · unhealthy since ${when(g.unhealthy_since)}` : ""} · last fine {when(g.last_ok_at)}
                </p>
              </div>
              <div className="row-actions">
                <button type="button" className="ghost small" disabled={!!busy} onClick={() => act(g.game, async () => {
                  const r = await checkNow(g.game);
                  return r.status === "ok" ? `${titleOf(g.game)} is fine now.`
                    : r.hidden === "needs_fixing" ? `${titleOf(g.game)} failed again, so it's hidden now: it's waiting in Needs fixing.`
                    : `${titleOf(g.game)} still fails.`;
                })}>{busy === g.game ? "Checking…" : "Check now"}</button>
                {can("games.needs_fixing") && (
                  <button type="button" className="link" onClick={() => go("needs-fixing")}>Mark as needing a fix</button>
                )}
              </div>
            </div>
            <ul className="health-problems">
              {g.problems.map((p, i) => <li key={i}>{p.message}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
