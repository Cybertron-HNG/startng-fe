import { useCallback, useEffect, useState } from "react";
import type { AdminTabProps } from "../registry";
import { approve, mark, queue, sendBack, type FixRequest } from "./api";
import { gameTitle as titleOf } from "../../gameTitle";

// start.ng/admin#needs-fixing: mark a broken game (it's hidden until fixed), and review games their owners say are fixed.

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");

export default function NeedsFixingTab({ ask }: AdminTabProps) {
  const [rows, setRows] = useState<FixRequest[] | null>(null);
  const [error, setError] = useState("");
  const [game, setGame] = useState("");
  const [note, setNote] = useState("");

  const reload = useCallback(() => {
    setError("");
    queue().then(setRows).catch((e) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);

  async function act(fn: () => Promise<unknown>) {
    setError("");
    try { await fn(); reload(); } catch (e) { setError(e instanceof Error ? e.message : "That didn't work"); }
  }

  async function markGame(e: React.FormEvent) {
    e.preventDefault();
    const name = game.trim().toLowerCase().replace(/^https?:\/\/[^/]+\/games\//, "").replace(/\/$/, "");
    if (await ask({ title: `Mark ${titleOf(name)} as needing a fix?`, body: <>It's hidden from start.ng and its own address until you put it back. Its owner sees your note in Your games.</>, confirm: "Mark and hide", danger: true }) === null) return;
    await act(() => mark(name, note.trim()));
    setGame("");
    setNote("");
  }

  const waiting = rows?.filter((r) => r.status === "owner_fixed") ?? [];
  const withOwner = rows?.filter((r) => r.status === "waiting_owner") ?? [];
  const card = (r: FixRequest) => (
    <article key={r.id} className="admin-item">
      <div className="admin-item-head">
        <div className="admin-item-title">
          <h3>
            <a href={r.game_url} target="_blank" rel="noreferrer">{titleOf(r.game)}</a>
            {r.automatic && <span className="pill">health check</span>}
            <span className={`pill ${r.status === "owner_fixed" ? "waiting" : "reported"}`}>{r.status === "owner_fixed" ? "owner says fixed" : "waiting for owner"}</span>
            {r.rounds > 1 && <span className="pill">round {r.rounds}</span>}
          </h3>
          <p className="note">by {r.owner} · marked by {r.created_by}, {when(r.created_at)}</p>
        </div>
        <div className="row-actions">
          {r.status === "owner_fixed" && (
            <button type="button" onClick={async () => {
              if (await ask({ title: `Put ${titleOf(r.game)} back?`, body: <>It goes live again on start.ng and at its own address.</>, confirm: "Put back" }) !== null) act(() => approve(r.id));
            }}>Put back</button>
          )}
          <button type="button" className="ghost" onClick={async () => {
            const text = await ask({ title: r.status === "owner_fixed" ? "Still broken?" : "Change the note?", body: <>Its owner sees this note. The game stays hidden.</>,
              confirm: "Send to owner", input: { label: "What's still wrong", initial: r.status === "owner_fixed" ? "" : r.note, required: true } });
            if (text) act(() => sendBack(r.id, text));
          }}>{r.status === "owner_fixed" ? "Send back" : "Change note"}</button>
        </div>
      </div>
      <p className="fix-note"><b>What's wrong:</b> {r.note}</p>
      {r.owner_note && <p className="fix-note"><b>Owner:</b> {r.owner_note} <span className="note">({when(r.owner_fixed_at)})</span></p>}
    </article>
  );

  return (
    <section>
      <h2>Needs fixing</h2>
      <p className="note">Mark a game that's broken (it doesn't load, a button does nothing, it breaks on phones). It's hidden until its owner fixes it and you put it back.</p>
      {error && <p className="error" role="alert">{error}</p>}

      <form className="fix-mark" onSubmit={markGame}>
        <input id="fix-game" value={game} onChange={(e) => setGame(e.target.value)} placeholder="Game name, e.g. lane-dash" required />
        <textarea id="fix-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} minLength={5} maxLength={1000} required
          placeholder="What's wrong, for its owner: e.g. It freezes on level 2" />
        <button type="submit" disabled={!game.trim() || note.trim().length < 5}>Mark as needing a fix</button>
      </form>

      <h2>Owner says it's fixed</h2>
      {rows && waiting.length === 0 && <p className="empty">Nothing to look at.</p>}
      <div className="admin-list">{waiting.map(card)}</div>

      <h2>Waiting for the owner</h2>
      {rows && withOwner.length === 0 && <p className="empty">No games waiting.</p>}
      <div className="admin-list">{withOwner.map(card)}</div>
    </section>
  );
}
