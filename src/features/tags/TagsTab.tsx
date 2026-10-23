import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminTabProps } from "../registry";
import { adminReview, adminSetTags, adminSuggest, adminTags, type ReviewRow, type Tag } from "./api";

// start.ng/admin#tags: the tag rules suggest tags for every game; a person approves them here, one game at a time.
// Nothing is shown to players until it is approved. A tag only gets a public page once 3 games have it.

function Row({ row, tags, onSaved }: { row: ReviewRow; tags: Tag[]; onSaved: () => void }) {
  const label = useMemo(() => new Map(tags.map((t) => [t.slug, t.label])), [tags]);
  const [picked, setPicked] = useState<string[]>(() => [...new Set([...row.approved, ...row.suggested])]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toggle = (s: string) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  const addable = tags.filter((t) => !picked.includes(t.slug) && !t.group.startsWith("Words people"));

  async function save() {
    setSaving(true);
    setError("");
    try { await adminSetTags(row.game, picked); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save"); } finally { setSaving(false); }
  }

  return (
    <article className="admin-item">
      <div className="admin-item-head">
        <div className="admin-item-title">
          <h3>{row.game}</h3>
          <p className="note">{row.suggested.length > 0 ? `${row.suggested.length} suggested` : "No suggestions"}{row.approved.length > 0 ? ` · ${row.approved.length} approved` : ""}</p>
        </div>
        <button type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
      <div className="chips tags-admin-chips" role="group" aria-label={`Tags for ${row.game}`}>
        {picked.map((s) => (
          <button key={s} type="button" className="on" aria-pressed="true" onClick={() => toggle(s)} title="Tap to remove">{label.get(s) ?? s} ✕</button>
        ))}
        <select value="" onChange={(e) => e.target.value && toggle(e.target.value)} aria-label={`Add a tag to ${row.game}`}>
          <option value="">+ Add a tag</option>
          {addable.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
        </select>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </article>
  );
}

export default function TagsTab({ ask }: AdminTabProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [pending, setPending] = useState(true);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setError("");
    adminReview(pending).then(setRows).catch((e) => setError(e.message));
  }, [pending]);
  useEffect(() => { adminTags().then(setTags).catch((e) => setError(e.message)); }, []);
  useEffect(reload, [reload]);

  async function suggest() {
    const ok = await ask({ title: "Suggest tags for every game?", body: "The rules look at each game's name and description and add suggestions. Nothing becomes public until you approve it.", confirm: "Suggest" });
    if (ok === null) return;
    try { const r = await adminSuggest(); setNote(`${r.added} suggestions added.`); reload(); } catch (e) { setError(e instanceof Error ? e.message : "Couldn't suggest"); }
  }

  return (
    <section>
      <div className="dup-head">
        <div>
          <h2>Tags</h2>
          <p className="note">Approve the tags on each game. Tap a tag to take it off, or add one. A tag gets its own page once 3 games have it. "Web games" and the other search words are on every game already.</p>
        </div>
        <div className="actions">
          <button type="button" className="ghost" onClick={() => setPending((p) => !p)}>{pending ? "Show all games" : "Show only games to review"}</button>
          <button type="button" onClick={suggest}>Suggest tags</button>
        </div>
      </div>
      {note && <p className="note" role="status">{note}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {rows && rows.length === 0 && <p className="empty">{pending ? "Nothing to review. Run Suggest tags to look for new suggestions." : "No games."}</p>}
      <div className="admin-list">
        {rows?.map((r) => <Row key={r.game + r.approved.join() + r.suggested.join()} row={r} tags={tags} onSaved={reload} />)}
      </div>
    </section>
  );
}
