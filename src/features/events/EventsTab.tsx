import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { EventHighlight, EventPartner, SpotlightEvent } from "../../eventMode";
import type { AdminTabProps } from "../registry";
import { adminEvents, changeEvent, createEvent, deleteEvent, deletePicture, makeCover, MAX_PICTURE_BYTES, MAX_PICTURES, setSpotlight, uploadPicture, type EventIn } from "./api";
import { imageUrl, timeLine } from "./format";

// start.ng/admin#events: add an event, give it pictures and details, and spotlight it on the homepage. Only one event is
// spotlighted at a time: turning one on turns the other off. Times are entered, and shown, in Nigeria time (UTC+1).

type Form = {
  title: string; tagline: string; description: string; starts: string; ends: string; venue: string; address: string;
  ticket_url: string; ticket_label: string; website_url: string; highlights: EventHighlight[]; partners: { name: string; url: string }[];
};
const EMPTY: Form = { title: "", tagline: "", description: "", starts: "", ends: "", venue: "", address: "", ticket_url: "", ticket_label: "Get tickets", website_url: "", highlights: [], partners: [] };

const NIGERIA = 3_600_000; // Nigeria is UTC+1 all year
const toInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + NIGERIA).toISOString().slice(0, 16) : "");
const fromInput = (v: string) => new Date(`${v}:00+01:00`).toISOString();
const fail = (e: unknown) => (e instanceof Error ? e.message : "That didn't work");

const formOf = (e: SpotlightEvent): Form => ({
  title: e.title, tagline: e.tagline ?? "", description: e.description, starts: toInput(e.starts_at), ends: toInput(e.ends_at), venue: e.venue, address: e.address ?? "",
  ticket_url: e.ticket_url ?? "", ticket_label: e.ticket_label, website_url: e.website_url ?? "", highlights: e.highlights, partners: e.partners.map((p) => ({ name: p.name, url: p.url ?? "" })),
});
const bodyOf = (f: Form): EventIn => ({
  title: f.title.trim(), tagline: f.tagline.trim() || null, description: f.description.trim(), starts_at: fromInput(f.starts), ends_at: f.ends ? fromInput(f.ends) : null,
  venue: f.venue.trim(), address: f.address.trim() || null, ticket_url: f.ticket_url.trim() || null, ticket_label: f.ticket_label.trim() || "Get tickets",
  website_url: f.website_url.trim() || null, highlights: f.highlights.filter((h) => h.title.trim()).map((h) => ({ title: h.title.trim(), text: h.text.trim() })),
  partners: f.partners.filter((p) => p.name.trim()).map((p) => ({ name: p.name.trim(), url: p.url.trim() || null })),
});

export default function EventsTab({ ask }: AdminTabProps) {
  const [events, setEvents] = useState<SpotlightEvent[] | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [queued, setQueued] = useState<File[]>([]); // pictures chosen before the event exists, uploaded right after it is saved
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(() => adminEvents().then(setEvents).catch((e) => setError(fail(e))), []);
  useEffect(() => { reload(); }, [reload]);

  const current = typeof editing === "number" ? events?.find((e) => e.id === editing) ?? null : null;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  function open(e: SpotlightEvent | null) {
    setError(""); setQueued([]);
    setForm(e ? formOf(e) : EMPTY);
    setEditing(e ? e.id : "new");
  }

  function chooseFiles(files: FileList | null, id?: number) {
    if (!files?.length) return;
    const picked = Array.from(files);
    const tooBig = picked.find((f) => f.size > MAX_PICTURE_BYTES);
    if (tooBig) { setError(`${tooBig.name} is over 5 MB. Use a smaller picture.`); return; }
    setError("");
    if (id === undefined) { setQueued((q) => [...q, ...picked].slice(0, MAX_PICTURES)); return; }
    void addNow(id, picked);
  }

  async function addNow(id: number, files: File[]) {
    setBusy(true);
    try { for (const f of files) await uploadPicture(id, f); await reload(); } catch (e) { setError(fail(e)); await reload(); } finally { setBusy(false); }
  }

  async function save(ev: FormEvent) {
    ev.preventDefault();
    setError("");
    if (!form.starts) { setError("Choose when the event starts"); return; }
    setBusy(true);
    try {
      let saved: SpotlightEvent;
      if (current) saved = await changeEvent(current.id, bodyOf(form));
      else {
        saved = await createEvent(bodyOf(form));
        for (const f of queued) await uploadPicture(saved.id, f);
      }
      setQueued([]);
      await reload();
      setEditing(saved.id);
    } catch (e) { setError(fail(e)); await reload(); } finally { setBusy(false); }
  }

  async function toggle(e: SpotlightEvent) {
    setError(""); setBusy(true);
    try { await setSpotlight(e.id, !e.spotlight); await reload(); } catch (err) { setError(fail(err)); } finally { setBusy(false); }
  }

  async function remove(e: SpotlightEvent) {
    const ok = await ask({ title: `Delete "${e.title}"?`, body: "Its details and pictures are deleted for good, and its page stops working.", confirm: "Delete event", danger: true });
    if (ok === null) return;
    setError("");
    try { await deleteEvent(e.id); if (editing === e.id) setEditing(null); await reload(); } catch (err) { setError(fail(err)); }
  }

  async function picture(action: () => Promise<unknown>) {
    setError("");
    try { await action(); await reload(); } catch (err) { setError(fail(err)); }
  }

  const rows = <T,>(list: T[], onChange: (next: T[]) => void, blank: T, max: number, render: (item: T, update: (patch: Partial<T>) => void) => JSX.Element, add: string) => (
    <div className="evt-rows">
      {list.map((item, i) => (
        <div className="evt-row" key={i}>
          {render(item, (patch) => onChange(list.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
          <button type="button" className="ghost" onClick={() => onChange(list.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      {list.length < max && <div><button type="button" className="ghost" onClick={() => onChange([...list, blank])}>{add}</button></div>}
    </div>
  );

  return (
    <section>
      <div className="dup-head">
        <div><h2>Events</h2><p className="note">Add an event, then spotlight it. While one is spotlighted it takes over the top of the homepage and the other promotions step aside. Times are Nigeria time.</p></div>
        {editing === null && <button type="button" onClick={() => open(null)}>Add an event</button>}
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      {editing === null && (
        <>
          {events?.length === 0 && <p className="empty">No events yet.</p>}
          <div className="admin-list">
            {events?.map((e) => (
              <article key={e.id} className="admin-item">
                <div className="admin-item-head">
                  <div className="admin-item-title">
                    <h3>{e.title} {e.spotlight && <span className="evt-badge">On the homepage</span>}</h3>
                    <div className="evt-admin-meta note">
                      <span>{timeLine(e)}</span><span>{e.venue}</span><span>{e.images.length} {e.images.length === 1 ? "picture" : "pictures"}</span>
                      {e.phase === "past" && <span>Ended</span>}
                    </div>
                  </div>
                  <div className="newsletter-actions">
                    <button type="button" disabled={busy} className={e.spotlight ? "ghost" : undefined} onClick={() => toggle(e)}>{e.spotlight ? "Take off the homepage" : "Spotlight it"}</button>
                    <button type="button" className="ghost" onClick={() => open(e)}>Edit</button>
                    <a className="ghost link" href={`/event/${e.slug}`} target="_blank" rel="noreferrer">View page</a>
                    <button type="button" className="ghost" onClick={() => remove(e)}>Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {editing !== null && (
        <form className="evt-form" onSubmit={save}>
          <h3>{current ? "Edit event" : "New event"}</h3>
          <label>Name<input required minLength={2} maxLength={80} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Tech Ember Fest 2026" /></label>
          <label>One line about it (optional)<input maxLength={160} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Build. Connect. Play." /></label>
          <label>
            About the event
            <textarea required minLength={10} maxLength={4000} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What it is, who it is for, what to expect. Leave a blank line between paragraphs." />
          </label>
          <div className="evt-form-row">
            <label>Starts<input type="datetime-local" required value={form.starts} onChange={(e) => set("starts", e.target.value)} /></label>
            <label>Ends (optional)<input type="datetime-local" value={form.ends} min={form.starts} onChange={(e) => set("ends", e.target.value)} /></label>
          </div>
          <div className="evt-form-row">
            <label>Venue<input required minLength={2} maxLength={120} value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Crystal Park" /></label>
            <label>Area and city (optional)<input maxLength={200} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Ozone, Yaba, Lagos" /></label>
          </div>
          <div className="evt-form-row">
            <label>Tickets link (optional)<input type="url" maxLength={300} value={form.ticket_url} onChange={(e) => set("ticket_url", e.target.value)} placeholder="https://..." /></label>
            <label>Button words<input minLength={2} maxLength={30} value={form.ticket_label} onChange={(e) => set("ticket_label", e.target.value)} /></label>
          </div>
          <label>Event website (optional)<input type="url" maxLength={300} value={form.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://..." /></label>

          <div>
            <h3>What's on (up to 6)</h3>
            {rows<EventHighlight>(form.highlights, (next) => set("highlights", next), { title: "", text: "" }, 6, (h, update) => (
              <>
                <input aria-label="Title" maxLength={40} value={h.title} onChange={(e) => update({ title: e.target.value })} placeholder="Physical games" />
                <input aria-label="A few words" maxLength={160} value={h.text} onChange={(e) => update({ text: e.target.value })} placeholder="A few words about it" />
              </>
            ), "Add something")}
          </div>
          <div>
            <h3>Partners and communities (up to 12)</h3>
            {rows<{ name: string; url: string }>(form.partners, (next) => set("partners", next), { name: "", url: "" }, 12, (p, update) => (
              <>
                <input aria-label="Name" maxLength={60} value={p.name} onChange={(e) => update({ name: e.target.value })} placeholder="Name" />
                <input aria-label="Link" type="url" maxLength={300} value={p.url} onChange={(e) => update({ url: e.target.value })} placeholder="https://... (optional)" />
              </>
            ), "Add a partner")}
          </div>

          <div>
            <h3>Pictures {current ? `(${current.images.length} of ${MAX_PICTURES})` : `(${queued.length} chosen)`}</h3>
            <p className="note">PNG, JPEG or WebP, up to 5 MB each. The first one is the cover on the homepage. An event needs at least one picture before it can be spotlighted.</p>
            {current && current.images.length > 0 && (
              <ul className="evt-pics">
                {current.images.map((img, i) => (
                  <li key={img.id}>
                    <img className={i === 0 ? "cover" : undefined} src={imageUrl(img.path)} alt={img.alt ?? ""} />
                    <div className="evt-pic-actions">
                      {i === 0 ? <strong>Cover</strong> : <button type="button" className="link" onClick={() => picture(() => makeCover(current.id, img.id))}>Make cover</button>}
                      <button type="button" className="link" onClick={() => picture(() => deletePicture(current.id, img.id))}>Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!current && queued.length > 0 && <p className="note">{queued.map((f) => f.name).join(", ")}</p>}
            <label>
              <span className="note">{current ? "Add pictures" : "Choose pictures (they are added when you save)"}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy || (current ? current.images.length >= MAX_PICTURES : queued.length >= MAX_PICTURES)}
                onChange={(e) => { chooseFiles(e.target.files, current?.id); e.target.value = ""; }} />
            </label>
          </div>

          <div className="newsletter-actions">
            <button type="submit" disabled={busy}>{busy ? "Saving…" : current ? "Save changes" : "Save event"}</button>
            <button type="button" className="ghost" onClick={() => { setEditing(null); setError(""); }}>Back to the list</button>
          </div>
        </form>
      )}
    </section>
  );
}
