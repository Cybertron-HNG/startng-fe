import { useCallback, useEffect, useState } from "react";
import { listGames, type PublishedGame } from "../../api";
import DateField from "../../DateField";
import type { AdminTabProps } from "../registry";
import {
  adminCreate, adminDelete, adminEntries, adminList, adminPublish, adminRemove, adminRestore, adminTemplates, adminUpdate,
  gameTitle, ordinal, type AdminEntry, type AdminMajor, type MajorBody, type Template,
} from "./api";
import { dayTime, statusText } from "./when";
import "./majors.css";

// start.ng/admin#majors: make a major from a template, look at the draft, publish it, and see who won.

const MAX_GAMES = 20;
const MAX_PRIZES = 10;

/** "2026-11-16T12:00" in the admin's own time, for the date picker. */
const localInput = (iso: string | null, fallbackHours: number) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + fallbackHours * 3_600_000);
  if (!iso) d.setMinutes(0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

type Form = Omit<MajorBody, "starts_at" | "ends_at" | "prizes"> & { start: string; end: string; prizes: string[] };
const toForm = (b: MajorBody): Form => ({
  ...b, about: b.about ?? "", partner_url: b.partner_url ?? "", partner_logo_url: b.partner_logo_url ?? "",
  cta_label: b.cta_label ?? "", cta_url: b.cta_url ?? "",
  prizes: [...b.prizes].sort((a, c) => a.place - c.place).map((p) => p.prize),
  start: localInput(b.starts_at, 24), end: localInput(b.ends_at, 24 * 15),
});
const toBody = (f: Form): MajorBody => ({
  slug: f.slug.trim(), title: f.title.trim(), tagline: f.tagline.trim(), about: f.about?.trim() || null,
  partner_name: f.partner_name.trim(), partner_url: f.partner_url?.trim() || null, partner_logo_url: f.partner_logo_url?.trim() || null,
  cta_label: f.cta_label?.trim() || null, cta_url: f.cta_url?.trim() || null,
  prizes: f.prizes.map((prize, i) => ({ place: i + 1, prize: prize.trim() })), games: f.games,
  starts_at: new Date(f.start).toISOString(), ends_at: new Date(f.end).toISOString(),
});
const BLANK: MajorBody = {
  slug: "", title: "", tagline: "", about: null, partner_name: "", partner_url: null, partner_logo_url: null,
  cta_label: null, cta_url: null, prizes: [{ place: 1, prize: "" }, { place: 2, prize: "" }, { place: 3, prize: "" }],
  games: [], starts_at: null, ends_at: null,
};

export default function MajorsTab({ ask }: AdminTabProps) {
  const [rows, setRows] = useState<AdminMajor[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [games, setGames] = useState<PublishedGame[]>([]);
  const [form, setForm] = useState<Form>(() => toForm(BLANK));
  const [editing, setEditing] = useState<string | null>(null); // the slug being changed (null: a new one)
  const [startedEditing, setStartedEditing] = useState(false); // it has started: its games, start and address are locked
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState("");
  const [open, setOpen] = useState<string | null>(null); // whose entrants are showing
  const [entries, setEntries] = useState<AdminEntry[] | null>(null);

  const reload = useCallback(() => { adminList().then(setRows).catch((e) => setError(e.message)); }, []);
  useEffect(reload, [reload]);
  useEffect(() => {
    adminTemplates().then(setTemplates).catch(() => setTemplates([]));
    listGames().then((all) => setGames(all.filter((g) => g.name !== "hangout" && g.leaderboard))).catch(() => setGames([]));
  }, []);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const known = new Set(games.map((g) => g.name));
  const shown = games.filter((g) => gameTitle(g.name).includes(query.trim().toLowerCase()) || form.games.includes(g.name));
  const toggle = (g: string) => set("games", form.games.includes(g) ? form.games.filter((n) => n !== g) : form.games.length < MAX_GAMES ? [...form.games, g] : form.games);

  /** Fill the form from a template or another major. Games that aren't on this start.ng are left out. */
  function fill(body: MajorBody, from: string, edit: AdminMajor | null = null) {
    const usable = games.length ? body.games.filter((g) => known.has(g)) : body.games;
    setForm(toForm({ ...body, games: usable }));
    setEditing(edit?.slug ?? null);
    setStartedEditing(!!edit && edit.state !== "upcoming");
    setError("");
    setNote(edit ? `Changing "${edit.title}".` : `Filled from ${from}. Change what you need, then save it as a draft.${usable.length < body.games.length ? " Some of its games aren't on start.ng any more, so pick others." : ""}`);
    document.getElementById("major-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    try {
      const saved = editing ? await adminUpdate(editing, toBody(form)) : await adminCreate(toBody(form));
      setNote(editing ? "Saved." : `Draft made. Look at it, then publish it: ${saved.link}`);
      setForm(toForm(BLANK));
      setEditing(null);
      setStartedEditing(false);
      reload();
    } catch (err) { setError(err instanceof Error ? err.message : "That didn't work"); } finally { setBusy(false); }
  }

  async function act(fn: () => Promise<unknown>, done: string) {
    setError("");
    setNote("");
    try { await fn(); setNote(done); reload(); } catch (err) { setError(err instanceof Error ? err.message : "That didn't work"); }
  }

  async function copy(text: string, key: string) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); } catch { /* shown on the page */ }
  }

  async function showEntries(slug: string) {
    if (open === slug) { setOpen(null); return; }
    setOpen(slug);
    setEntries(null);
    adminEntries(slug).then(setEntries).catch((e) => setError(e.message));
  }

  const ready = form.slug.trim().length >= 3 && form.title.trim().length >= 3 && form.tagline.trim().length >= 3
    && form.partner_name.trim().length >= 2 && form.games.length > 0 && form.prizes.length > 0 && form.prizes.every((p) => p.trim().length >= 2);

  return (
    <section>
      <h2>Majors</h2>
      <p className="note">A major is a big public tournament run with a partner, with real prizes. Start from a template, save it as a draft, look at the page, then publish it. It shows on the home page while it's on.</p>
      {error && <p className="error" role="alert">{error}</p>}
      {note && <p className="ok" role="status">{note}</p>}

      <form id="major-form" className="private-form major-form" onSubmit={submit}>
        {!editing && (
          <div className="major-template">
            <label className="field">
              <span>Start from a template</span>
              <select defaultValue="" onChange={(e) => {
                const tpl = templates.find((x) => x.key === e.target.value);
                const past = rows?.find((r) => `major:${r.slug}` === e.target.value);
                if (tpl) fill(tpl.major, `"${tpl.label}"`);
                else if (past) fill({ ...past.template, slug: "", starts_at: null, ends_at: null }, `"${past.title}"`);
                e.target.value = "";
              }}>
                <option value="" disabled>Pick one…</option>
                {templates.map((tpl) => <option key={tpl.key} value={tpl.key}>{tpl.label}</option>)}
                {rows?.map((r) => <option key={`major:${r.slug}`} value={`major:${r.slug}`}>Copy of {r.title}</option>)}
              </select>
            </label>
            <p className="note">Or use "Use as a template" on any major below. A template fills the form: nothing is saved until you save the draft.</p>
          </div>
        )}
        <div className="major-form-row">
          <label className="field"><span>Name</span><input value={form.title} onChange={(e) => set("title", e.target.value)} minLength={3} maxLength={80} required placeholder="e.g. Tech Ember Fest Major" /></label>
          <label className="field"><span>Address: start.ng/majors/…</span><input value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} minLength={3} maxLength={40} required disabled={startedEditing} placeholder="techemberfest" /></label>
        </div>
        <label className="field"><span>One line under the name</span><input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} minLength={3} maxLength={160} required placeholder="What players can win, and from whom" /></label>
        <div className="major-form-row">
          <label className="field"><span>Partner</span><input value={form.partner_name} onChange={(e) => set("partner_name", e.target.value)} minLength={2} maxLength={60} required placeholder="Tech Ember Fest" /></label>
          <label className="field"><span>Partner's website</span><input type="url" value={form.partner_url ?? ""} onChange={(e) => set("partner_url", e.target.value)} maxLength={300} placeholder="https://" /></label>
          <label className="field"><span>Partner's logo (a picture address)</span><input type="url" value={form.partner_logo_url ?? ""} onChange={(e) => set("partner_logo_url", e.target.value)} maxLength={300} placeholder="https://" /></label>
        </div>
        <label className="field"><span>About the partner or the event</span><textarea value={form.about ?? ""} onChange={(e) => set("about", e.target.value)} maxLength={1200} placeholder="Two or three sentences: what it is, when and where." /></label>
        <div className="major-form-row">
          <label className="field"><span>Button's words (optional)</span><input value={form.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} maxLength={40} placeholder="Get tickets" /></label>
          <label className="field"><span>Button's link</span><input type="url" value={form.cta_url ?? ""} onChange={(e) => set("cta_url", e.target.value)} maxLength={300} placeholder="https://" /></label>
        </div>

        <fieldset className="field">
          <span>Prizes, best place first</span>
          <div className="major-prize-rows">
            {form.prizes.map((p, i) => (
              <div key={i} className="major-prize-row">
                <b>{ordinal(i + 1)}</b>
                <input value={p} onChange={(e) => set("prizes", form.prizes.map((x, j) => (j === i ? e.target.value : x)))} minLength={2} maxLength={120} required aria-label={`${ordinal(i + 1)} prize`} placeholder="What this place wins" />
                <button type="button" className="ghost small" disabled={form.prizes.length <= 1} onClick={() => set("prizes", form.prizes.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
          </div>
          {form.prizes.length < MAX_PRIZES && <button type="button" className="link" onClick={() => set("prizes", [...form.prizes, ""])}>Add a place</button>}
        </fieldset>

        <fieldset className="field private-games" disabled={startedEditing}>
          <span>Pick up to {MAX_GAMES} games ({form.games.length} picked){startedEditing ? " · locked: it has started" : ""}</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search games" aria-label="Search games" />
          <div className="private-game-list">
            {shown.map((g) => (
              <label key={g.name} className={form.games.includes(g.name) ? "on" : ""}>
                <input type="checkbox" checked={form.games.includes(g.name)} disabled={!form.games.includes(g.name) && form.games.length >= MAX_GAMES} onChange={() => toggle(g.name)} />
                <span className="thumb">{g.cover_url ? <img src={g.cover_url} alt="" loading="lazy" decoding="async" /> : g.name.charAt(0).toUpperCase()}</span>
                <span className="gname">{gameTitle(g.name)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="admin-tournament-times">
          <div className="field"><span>Starts</span>{startedEditing ? <p className="note">{dayTime(new Date(form.start).toISOString())} (it has started)</p> : <DateField time value={form.start} onChange={(v) => set("start", v)} label="Starts" required />}</div>
          <div className="field"><span>Ends</span><DateField time value={form.end} onChange={(v) => set("end", v)} min={form.start.slice(0, 10)} label="Ends" required /></div>
        </div>
        <p className="note">Times are your own time. A major runs from 1 hour to 45 days. End it a few days before the partner's event, so winners get their prizes in time.</p>
        <div className="private-submit row-actions">
          <button type="submit" disabled={busy || !ready}>{busy ? "Saving…" : editing ? "Save the changes" : "Save as a draft"}</button>
          {editing && <button type="button" className="ghost" onClick={() => { setEditing(null); setStartedEditing(false); setForm(toForm(BLANK)); setNote(""); }}>Cancel</button>}
        </div>
      </form>

      <h2>Every major</h2>
      {rows && rows.length === 0 && <p className="empty">None yet. Start from a template above.</p>}
      <div className="admin-list">
        {rows?.map((r) => (
          <article key={r.slug} className="admin-item">
            <div className="admin-item-head">
              <div className="admin-item-title">
                <h3>
                  <a href={`/majors/${r.slug}`} target="_blank" rel="noreferrer">{r.title} ↗</a>
                  <span className={`pill ${r.published && r.state !== "ended" ? "waiting" : ""}`}>{r.published ? statusText(r) : "Draft"}</span>
                </h3>
                <p className="note">With {r.partner.name} · {dayTime(r.starts_at)} to {dayTime(r.ends_at)} · {r.entrants} entered · {r.games.map(gameTitle).join(", ")}</p>
                <p className="note"><code>{r.link}</code></p>
              </div>
              <div className="row-actions">
                {r.published
                  ? <button type="button" className="ghost small" onClick={async () => {
                      if (await ask({ title: `Take ${r.title} down?`, body: <>It goes back to a draft: players can't see it and scores stop counting. Entries and scores so far are kept.</>, confirm: "Take it down", danger: true }) !== null)
                        act(() => adminPublish(r.slug, false), "It's a draft again.");
                    }}>Unpublish</button>
                  : <button type="button" className="small" onClick={async () => {
                      if (await ask({ title: `Publish ${r.title}?`, body: <>Everyone can see it at {r.link}, and it shows on the home page while it's on.</>, confirm: "Publish" }) !== null)
                        act(() => adminPublish(r.slug, true), "Published.");
                    }}>Publish</button>}
                {r.state !== "ended" && <button type="button" className="ghost small" onClick={() => fill(r.template, "", r)}>Change</button>}
                <button type="button" className="ghost small" onClick={() => fill({ ...r.template, slug: "", starts_at: null, ends_at: null }, `"${r.title}"`)}>Use as a template</button>
                <button type="button" className="ghost small" onClick={() => copy(JSON.stringify(r.template, null, 2), `json:${r.slug}`)}>{copied === `json:${r.slug}` ? "Copied" : "Copy as JSON"}</button>
                <button type="button" className="ghost small" onClick={() => copy(r.link, r.link)}>{copied === r.link ? "Copied" : "Copy link"}</button>
                <button type="button" className="ghost small" onClick={() => showEntries(r.slug)}>{open === r.slug ? "Hide players" : "Players"}</button>
                <button type="button" className="danger small" onClick={async () => {
                  if (await ask({ title: `Delete ${r.title}?`, body: <>Its page, players and standings go for good.</>, confirm: "Delete", danger: true, typeToConfirm: r.entrants > 0 ? "DELETE" : undefined }) !== null)
                    act(() => adminDelete(r.slug), "Deleted.");
                }}>Delete</button>
              </div>
            </div>
            {r.winners.length > 0 && (
              <div className="major-entries" aria-label="Winners">
                {r.winners.map((w) => (
                  <div key={w.place} className="major-entry">
                    <span><b>{ordinal(w.place)}</b> · {w.name} · {w.points} points · {w.prize}</span>
                    <span className="row-actions">
                      <a href={`mailto:${w.email}`}>{w.email}</a>
                      <button type="button" className="ghost small" onClick={() => copy(w.email, w.email)}>{copied === w.email ? "Copied" : "Copy email"}</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {open === r.slug && (
              <div className="major-entries" aria-label="Players">
                {!entries && <p className="note" role="status">Loading…</p>}
                {entries && entries.length === 0 && <p className="note">Nobody has entered yet.</p>}
                {entries?.map((p) => (
                  <div key={p.player_id} className={`major-entry ${p.removed ? "out" : ""}`}>
                    <span>{p.place ? `#${p.place}` : "–"} · {p.name} · {p.points} points · {p.email}{p.removed ? ` · taken out: ${p.removed_note ?? ""}` : ""}</span>
                    {p.removed
                      ? <button type="button" className="ghost small" onClick={() => act(() => adminRestore(r.slug, p.player_id), "Put back.").then(() => adminEntries(r.slug).then(setEntries))}>Put back</button>
                      : <button type="button" className="danger small" onClick={async () => {
                          const why = await ask({ title: `Take ${p.name} out?`, body: <>Their scores stop counting and showing in this major. They can still play start.ng.</>, confirm: "Take out", danger: true, input: { label: "Why (kept in the admin log)", placeholder: "e.g. a score the game can't give", required: true } });
                          if (why !== null) act(() => adminRemove(r.slug, p.player_id, why), "Taken out.").then(() => adminEntries(r.slug).then(setEntries));
                        }}>Take out</button>}
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
