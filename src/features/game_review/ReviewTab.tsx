import { useCallback, useEffect, useState } from "react";
import { toCard } from "../../games";
import type { AdminTabProps } from "../registry";
import { approve, queue, reject, type Queue, type Review } from "./api";
import { gameTitle as titleOf } from "../../gameTitle";

// start.ng/admin#game-review: new games wait here before they're listed. Open the game, then approve or reject it
// with a reason (its owner is emailed either way).

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");
const HEALTH: Record<string, string> = { ok: "loads", failing: "failing a check", unhealthy: "not loading", unchecked: "not checked yet" };

function Art({ r }: { r: Review }) {
  const c = toCard({ name: r.game, url: r.url, repo_url: r.repo_url, by: r.owner ?? "", updated_at: "", cover_url: r.cover_url, leaderboard: null });
  return (
    <span className="admin-art" style={{ background: `linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})` }}>
      {c.cover ? <img src={c.cover} alt="" loading="lazy" decoding="async" /> : <span>{c.title.charAt(0)}</span>}
    </span>
  );
}

export default function ReviewTab({ ask }: AdminTabProps) {
  const [data, setData] = useState<Queue | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [why, setWhy] = useState("");

  const reload = useCallback(() => {
    setError("");
    queue().then(setData).catch((e) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);

  async function act(game: string, fn: () => Promise<unknown>, done: string) {
    setBusy(game);
    setError("");
    setNote("");
    try { await fn(); setNote(done); setRejecting(null); reload(); } catch (e) { setError(e instanceof Error ? e.message : "That didn't work"); } finally { setBusy(""); }
  }

  async function approveGame(r: Review) {
    if (await ask({ title: `Approve ${titleOf(r.game)}?`, body: <>It's listed on start.ng straight away, and its owner is emailed.</>, confirm: "Approve" }) === null) return;
    act(r.game, () => approve(r.game), `${titleOf(r.game)} is listed.`);
  }

  function startReject(r: Review) {
    setRejecting(r.game);
    setReason("");
    setWhy("");
  }

  const card = (r: Review) => (
    <article key={r.game} className="admin-item">
      <div className="admin-item-head">
        <Art r={r} />
        <div className="admin-item-title">
          <h3>
            <a href={r.url} target="_blank" rel="noreferrer">{titleOf(r.game)} ↗</a>
            {r.rounds > 1 && <span className="pill">sent again (round {r.rounds})</span>}
            {r.status === "rejected" && <span className="pill reported">not approved</span>}
          </h3>
          <p className="note">
            by {r.owner} · sent {when(r.submitted_at)} · <a href={r.repo_url} target="_blank" rel="noreferrer">repo ↗</a>
            {r.meets_standards === false && " · doesn't meet the game standards"}
            {r.health && ` · ${HEALTH[r.health] ?? r.health}`}
          </p>
          {r.description && <p className="fix-note">{r.description}</p>}
          {r.status === "rejected" && (
            <p className="fix-note"><b>Why:</b> {r.reason_label}{r.note ? ` — ${r.note}` : ""} <span className="note">({r.decided_by}, {when(r.decided_at)})</span></p>
          )}
        </div>
        <div className="row-actions">
          <button type="button" disabled={!!busy} onClick={() => approveGame(r)}>Approve</button>
          {r.status === "pending" && (
            <button type="button" className="ghost" disabled={!!busy} onClick={() => startReject(r)}>Reject</button>
          )}
        </div>
      </div>
      {rejecting === r.game && data && (
        <form className="fix-mark" onSubmit={(e) => {
          e.preventDefault();
          act(r.game, () => reject(r.game, reason, why.trim()), `${titleOf(r.game)} wasn't approved; its owner was told why.`);
        }}>
          <label className="field">
            <span>Why</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} required>
              <option value="" disabled>Pick a reason</option>
              {Object.entries(data.reasons).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={2} maxLength={1000} required={reason === "other"}
            placeholder="A note for its owner: what to fix (they see this)" aria-label="Note for the owner" />
          <div className="row-actions">
            <button type="submit" className="danger" disabled={!reason || (reason === "other" && !why.trim()) || !!busy}>Reject and tell the owner</button>
            <button type="button" className="ghost" onClick={() => setRejecting(null)}>Cancel</button>
          </div>
        </form>
      )}
    </article>
  );

  return (
    <section>
      <h2>Game review</h2>
      <p className="note">New games wait here before they're listed. Open the game (its address works while it waits), then approve it or say what to fix. Its owner is emailed either way; a rejected game comes back here when they push a fix. Only the first publish is reviewed.</p>
      {error && <p className="error" role="alert">{error}</p>}
      {note && <p className="ok" role="status">{note}</p>}

      <h2>Waiting ({data?.pending.length ?? 0})</h2>
      {data && data.pending.length === 0 && <p className="empty">Nothing to review.</p>}
      <div className="admin-list">{data?.pending.map(card)}</div>

      <h2>Not approved</h2>
      {data && data.rejected.length === 0 && <p className="empty">None.</p>}
      <div className="admin-list">{data?.rejected.map(card)}</div>
    </section>
  );
}
