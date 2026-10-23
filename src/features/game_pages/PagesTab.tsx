import { useCallback, useEffect, useState } from "react";
import type { AdminTabProps } from "../registry";
import { adminApprove, adminGaps, adminGenerate, adminPage, adminPages, adminSave, adminSummary, adminUnapprove, type Gap, type PageFull, type PageRow, type Summary } from "./api";

// start.ng/admin#game-pages: pages about each game (about, how to play, FAQ, walkthrough). They are written from the facts in a
// game's own files; a person reads, edits and approves each one. A game that says too little gets no page, and is listed so
// its creator can be asked to add a description.

const KIND: Record<string, string> = { about: "About", "how-to-play": "How to play", faq: "FAQ", walkthrough: "Walkthrough" };

function Editor({ id, onChanged }: { id: number; onChanged: () => void }) {
  const [page, setPage] = useState<PageFull | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(() => adminPage(id).then((p) => { setPage(p); setTitle(p.title); setDescription(p.description); setBody(p.body); }).catch((e) => setError(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  if (!page) return <p className="note" aria-busy="true">{error || "Loading…"}</p>;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await fn(); await load(); onChanged(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); } finally { setBusy(false); }
  }
  const dirty = title !== page.title || description !== page.description || body !== page.body;
  return (
    <div className="gp-editor">
      <label>Title <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} /></label>
      <label>Description (what search results show) <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} /></label>
      <label>Text <span className="note">## Heading, a line of text, - bullet, 1. step</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} />
      </label>
      {page.facts && (
        <details>
          <summary>What this was written from</summary>
          <pre className="gp-facts">{JSON.stringify(page.facts, null, 2)}</pre>
        </details>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="button" className="ghost" disabled={busy || !dirty} onClick={() => run(() => adminSave(id, title, description, body))}>Save changes</button>
        {page.status !== "approved"
          ? <button type="button" disabled={busy || dirty} onClick={() => run(() => adminApprove(id))} title={dirty ? "Save your changes first" : ""}>Approve and publish</button>
          : <><a className="btn ghost" href={`/games/${page.game}/${page.kind}`} target="_blank" rel="noreferrer">Open the page</a>
              <button type="button" className="ghost" disabled={busy} onClick={() => run(() => adminUnapprove(id))}>Take it down</button></>}
      </div>
    </div>
  );
}

export default function PagesTab({ ask }: AdminTabProps) {
  const [status, setStatus] = useState("draft");
  const [rows, setRows] = useState<PageRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setError("");
    adminPages(status).then(setRows).catch((e) => setError(e.message));
    adminSummary().then(setSummary).catch(() => {});
  }, [status]);
  useEffect(reload, [reload]);

  async function generate() {
    const ok = await ask({ title: "Make draft pages?", body: "This reads each game's files and writes draft pages from what they say. Pages already approved or edited by a person are kept.", confirm: "Make drafts" });
    if (ok === null) return;
    try { const c = await adminGenerate(); setNote(`${c.draft ?? 0} drafts, ${c.approved ?? 0} approved, ${c.skipped ?? 0} not made.`); reload(); } catch (e) { setError(e instanceof Error ? e.message : "Couldn't make pages"); }
  }

  return (
    <section>
      <div className="dup-head">
        <div>
          <h2>Game pages</h2>
          <p className="note">About, how to play, FAQ and walkthrough pages for each game, written only from what its own files say. Read, edit and approve each one. {summary && `${summary.approved} approved · ${summary.draft} waiting · ${summary.skipped} not made · ${summary.games_without_pages} games have no page at all.`}</p>
        </div>
        <div className="actions">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setOpen(null); }} aria-label="Show">
            <option value="draft">Waiting for review</option>
            <option value="approved">Approved</option>
            <option value="skipped">Not made</option>
            <option value="all">Everything</option>
          </select>
          <button type="button" onClick={generate}>Make draft pages</button>
        </div>
      </div>
      {note && <p className="note" role="status">{note}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {rows && rows.length === 0 && <p className="empty">Nothing here. {status === "draft" ? "Make draft pages to look for games that say enough." : ""}</p>}
      <div className="admin-list">
        {rows?.map((r) => (
          <article key={r.id} className="admin-item">
            <div className="admin-item-head">
              <div className="admin-item-title">
                <h3>{r.game} · {KIND[r.kind] ?? r.kind}</h3>
                <p className="note">{r.status === "skipped" ? r.reason : `${r.status}${r.edited ? " · edited by a person" : ""}`}</p>
              </div>
              {r.status !== "skipped" && <button type="button" className="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Close" : "Review"}</button>}
            </div>
            {open === r.id && <Editor id={r.id} onChanged={reload} />}
          </article>
        ))}
      </div>
      <div className="gp-gaps">
        <button type="button" className="ghost" onClick={() => (gaps ? setGaps(null) : adminGaps().then(setGaps).catch((e) => setError(e.message)))}>{gaps ? "Hide" : "Show"} games with no page</button>
        {gaps && (
          <ul>{gaps.map((g) => <li key={g.game}><b>{g.game}</b>: {g.reasons[0]}</li>)}</ul>
        )}
      </div>
    </section>
  );
}
