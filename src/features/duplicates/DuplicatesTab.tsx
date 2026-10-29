import { useCallback, useEffect, useState } from "react";
import { toCard } from "../../games";
import type { AdminTabProps } from "../registry";
import { hiddenCopies, hide, keep, pairs, remove, scan, show, type Hidden, type Pair, type Reason, type Side } from "./api";
import { gameTitle as titleOf } from "../../gameTitle";

// start.ng/admin#duplicates: games that look like copies of each other, side by side (older first), to hide, delete or keep.

const REASONS: Record<Reason, string> = {
  same_files: "Same files",
  same_page: "Same page",
  same_cover: "Same cover",
  similar_name: "Similar name",
};
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });

function Art({ side }: { side: Side }) {
  const c = toCard({ name: side.name, url: side.url, repo_url: "", by: side.owner, updated_at: "", cover_url: side.cover_url, leaderboard: null });
  return (
    <span className="admin-art" style={{ background: `linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})` }}>
      {c.cover ? <img src={c.cover} alt="" loading="lazy" decoding="async" /> : <span>{c.title.charAt(0)}</span>}
    </span>
  );
}

export default function DuplicatesTab({ ask }: AdminTabProps) {
  const [list, setList] = useState<Pair[] | null>(null);
  const [hidden, setHidden] = useState<Hidden[] | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    setError("");
    pairs().then(setList).catch((e) => setError(e.message));
    hiddenCopies().then(setHidden).catch((e) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);

  async function act(fn: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setError("");
    setNote("");
    try { await fn(); if (done) setNote(done); reload(); } catch (e) { setError(e instanceof Error ? e.message : "That didn't work"); } finally { setBusy(false); }
  }

  async function hideCopy(copy: Side, of: Side) {
    if (await ask({ title: `Hide ${titleOf(copy.name)}?`, body: <>It's hidden as a copy of {titleOf(of.name)}, from start.ng and its own address. Its owner sees which game. You can put it back.</>,
      confirm: "Hide as a copy", danger: true }) !== null) act(() => hide(copy.name, of.name));
  }
  async function deleteCopy(copy: Side) {
    if (await ask({ title: `Delete ${titleOf(copy.name)}?`, body: <>This deletes the game, its files, scores and plays for good. It can't be undone. Its owner's account stays.</>,
      confirm: "Delete for good", danger: true, typeToConfirm: "DELETE" }) !== null) act(() => remove(copy.name));
  }

  const side = (s: Side, label: string, other: Side) => (
    <div className="dup-side">
      <Art side={s} />
      <div>
        <span className="note">{label}</span>
        <h3><a href={`/games/${s.name}`} target="_blank" rel="noreferrer">{titleOf(s.name)}</a>{s.hidden && <span className={`pill ${s.hidden}`}>hidden</span>}</h3>
        <p className="note">by {s.owner} · {day(s.created_at)}</p>
      </div>
      <div className="row-actions">
        {!s.hidden && <button type="button" className="ghost small" disabled={busy} onClick={() => hideCopy(s, other)}>Hide as copy</button>}
        <button type="button" className="danger small" disabled={busy} onClick={() => deleteCopy(s)}>Delete</button>
      </div>
    </div>
  );

  return (
    <section>
      <div className="dup-head">
        <div>
          <h2>Possible duplicates</h2>
          <p className="note">Games that look like the same game: same files, same page, same cover or a near-identical name. The older one is on the left.</p>
        </div>
        <button type="button" className="ghost" disabled={busy} onClick={() => act(async () => {
          const r = await scan();
          setNote(`Checked ${r.scanned} games.`);
        })}>Scan all games</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {note && <p className="ok" role="status">{note}</p>}
      {list && list.length === 0 && <p className="empty">No look-alikes. New games are checked when they're published; "Scan all games" checks older ones.</p>}
      <div className="admin-list">
        {list?.map((p) => (
          <article key={`${p.a.name}-${p.b.name}`} className="admin-item dup-pair">
            <div className="chips dup-reasons">
              {p.reasons.map((r) => <span key={r} className={`pill ${r === "same_files" || r === "same_page" ? "flagged" : ""}`}>{REASONS[r]}</span>)}
              {p.same_owner && <span className="pill">same owner</span>}
            </div>
            <div className="dup-sides">
              {side(p.a, "Older", p.b)}
              {side(p.b, "Newer", p.a)}
            </div>
            <div className="row-actions">
              <button type="button" className="link" disabled={busy} onClick={() => act(() => keep(p.a.name, p.b.name), "Kept both. That pair won't show again.")}>Both are fine, keep both</button>
            </div>
          </article>
        ))}
      </div>

      <h2>Hidden as copies</h2>
      {hidden && hidden.length === 0 && <p className="empty">None.</p>}
      <div className="admin-list">
        {hidden?.map((h) => (
          <article key={h.game.name} className="admin-item">
            <div className="admin-item-head">
              <Art side={h.game} />
              <div className="admin-item-title">
                <h3><a href={`/games/${h.game.name}`} target="_blank" rel="noreferrer">{titleOf(h.game.name)}</a></h3>
                <p className="note">by {h.game.owner} · a copy of {h.of ? titleOf(h.of) : "another game"} · hidden by {h.decided_by}</p>
              </div>
              <button type="button" className="ghost" disabled={busy} onClick={async () => {
                if (await ask({ title: `Put ${titleOf(h.game.name)} back?`, body: <>It isn't a copy after all. It goes live again, and this pair won't show again.</>, confirm: "Put back" }) !== null)
                  act(() => show(h.game.name));
              }}>Put back</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
