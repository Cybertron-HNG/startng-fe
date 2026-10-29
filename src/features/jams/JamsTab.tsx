import { useCallback, useEffect, useState } from "react";
import DateField from "../../DateField";
import type { AdminTabProps } from "../registry";
import { adminCreate, adminJams, day, type Jam } from "./api";

// start.ng/admin#jams: make a game jam. Creators enter by publishing with "jam": "<short name>" in startng.json while it's open;
// players who have played an entry vote during voting week; the most-voted entries win.

/** "2026-10-25T18:00" in the admin's own time, on the hour, days from now. */
const localInput = (daysFromNow: number) => {
  const h = new Date(Date.now() + daysFromNow * 86_400_000);
  h.setMinutes(0, 0, 0);
  return new Date(h.getTime() - h.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const PHASE: Record<Jam["phase"], string> = { soon: "Not open yet", open: "Taking entries", voting: "Voting", over: "Finished" };

export default function JamsTab(_: AdminTabProps) {
  const [rows, setRows] = useState<Jam[] | null>(null);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [opens, setOpens] = useState(localInput(1));
  const [closes, setCloses] = useState(localInput(11));
  const [ends, setEnds] = useState(localInput(18));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const reload = useCallback(() => adminJams().then(setRows).catch((e) => setError(e instanceof Error ? e.message : "Couldn't load the jams")), []);
  useEffect(() => { reload(); }, [reload]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNote("");
    try {
      const made = await adminCreate({ slug, title: title.trim(), brief: brief.trim(), opens_at: new Date(opens).toISOString(),
        entries_close_at: new Date(closes).toISOString(), voting_ends_at: new Date(ends).toISOString() });
      setNote(`Made. Creators enter with "jam": "${made.slug}" in startng.json.`);
      setSlug(""); setTitle(""); setBrief("");
      reload();
    } catch (err) { setError(err instanceof Error ? err.message : "That didn't work"); } finally { setBusy(false); }
  }

  return (
    <section>
      <h2>Game jams</h2>
      <p className="note">A theme and a deadline. Creators enter by publishing a game with <code>"jam": "short-name"</code> in its startng.json while the jam takes entries. Then players who have played an entry can vote for it until voting ends, and the three entries with the most votes win.</p>
      {error && <p className="error" role="alert">{error}</p>}
      {note && <p className="ok" role="status">{note}</p>}

      <form className="private-form" onSubmit={submit}>
        <label className="field">
          <span>Theme</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={80} required placeholder="e.g. Lagos rush hour" />
        </label>
        <label className="field">
          <span>Short name (its address: start.ng/jam/short-name)</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]" required placeholder="lagos-rush-hour" />
        </label>
        <label className="field">
          <span>Brief (what to make)</span>
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} minLength={10} maxLength={400} rows={3} required placeholder="Make a game about getting across Lagos at 6pm." />
        </label>
        <div className="admin-tournament-times">
          <div className="field"><span>Opens</span><DateField time value={opens} onChange={setOpens} label="Opens" required /></div>
          <div className="field"><span>Entries close</span><DateField time value={closes} onChange={setCloses} min={opens.slice(0, 10)} label="Entries close" required /></div>
          <div className="field"><span>Voting ends</span><DateField time value={ends} onChange={setEnds} min={closes.slice(0, 10)} label="Voting ends" required /></div>
        </div>
        <p className="note">Times are your own time. The jam page shows dates in UTC.</p>
        <div className="private-submit">
          <button type="submit" disabled={busy}>{busy ? "Making…" : "Make the jam"}</button>
        </div>
      </form>

      <h2>Jams</h2>
      {rows && rows.length === 0 && <p className="empty">None yet.</p>}
      <div className="admin-list">
        {rows?.map((j) => (
          <article key={j.slug} className="admin-item">
            <div className="admin-item-head">
              <div className="admin-item-title">
                <h3><a href={`/jam/${j.slug}`} target="_blank" rel="noreferrer">{j.title} ↗</a> <span className={`pill ${j.phase === "over" ? "" : "waiting"}`}>{PHASE[j.phase]}</span></h3>
                <p className="note">Opens {day(j.opens_at)} · entries close {day(j.entries_close_at)} · voting ends {day(j.voting_ends_at)} · {j.entries} entr{j.entries === 1 ? "y" : "ies"}</p>
                <p className="note"><code>"jam": "{j.slug}"</code></p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
