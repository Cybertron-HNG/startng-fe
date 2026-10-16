import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { COVER_TYPES, ExploreGame, ExploreRefused, MAX_COVER_BYTES, exploreCover, listExploreGames, removeExploreGame, submitExploreGame } from "./api";

// ---- helpers

const MIN_COVER = { w: 640, h: 400 };
// The removal key for each game this browser listed, so its creator can take it down later.
const REMOVAL_KEYS = "startng-explore-keys";

const loadKeys = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(REMOVAL_KEYS) ?? "{}"); } catch { return {}; }
};
const saveKey = (id: number, key: string) => {
  try { localStorage.setItem(REMOVAL_KEYS, JSON.stringify({ ...loadKeys(), [id]: key })); } catch { /* blocked: the creator still has it on screen */ }
};
const forgetKey = (id: number) => {
  const keys = loadKeys();
  delete keys[id];
  try { localStorage.setItem(REMOVAL_KEYS, JSON.stringify(keys)); } catch { /* nothing to forget */ }
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
// Every word typed appears in the game's name or the creator's name (ignoring case and accents).
const matches = (g: ExploreGame, q: string) => fold(q).split(/\s+/).filter(Boolean).every((t) => fold(g.name).includes(t) || fold(g.creator).includes(t));
// Never put a link on the page unless it is a plain web address, whatever the server sent.
const isWebLink = (url: string) => /^https?:\/\//i.test(url);

// ---- the form's rules. start.ng checks all of these again on the server: this is for quick feedback.

function lengthRule(value: string, what: string, min: number, max: number): string | null {
  const t = clean(value);
  if (!t) return `Enter ${what}.`;
  if (t.length < min) return `This needs at least ${min} characters.`;
  if (t.length > max) return `Keep this to ${max} characters or fewer.`;
  return null;
}
function descriptionRule(value: string): string | null {
  const t = value.trim();
  if (!t) return "Describe your game in a few sentences.";
  if (t.length < 20) return `Add a little more detail: ${20 - t.length} more characters needed.`;
  if (t.length > 500) return "Keep the description to 500 characters or fewer.";
  return null;
}
const PRIVATE_HOST = /^localhost$|\.(localhost|local|internal|lan|home|corp|intranet)$/;
function linkRule(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Enter the address where people play your game.";
  if (v.length > 300) return "That address is too long. Keep it under 300 characters.";
  let u: URL;
  try { u = new URL(v); } catch { return "That does not look like a web address. Start it with https://, for example https://yourgame.com"; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return `Only http:// and https:// links are allowed. A "${u.protocol}" link is not.`;
  if (u.username || u.password) return "Remove the username and password from the address.";
  const host = u.hostname.toLowerCase();
  if (host === "start.ng" || host.endsWith(".start.ng")) return "Games on start.ng are published with the API and appear on the Games page, not here. See the docs.";
  const ip = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  const [a, b] = ip ? [Number(ip[1]), Number(ip[2])] : [-1, -1];
  const privateIp = a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  if (PRIVATE_HOST.test(host) || host.includes(":") || !host.includes(".") || privateIp) return "Use a public address. localhost and private network addresses cannot be opened by players.";
  return null;
}
const httpWarning = (raw: string) => (/^http:\/\//i.test(raw.trim()) ? 'This link uses http://. Browsers mark it "not secure" and some block it. Use https:// if your game supports it.' : null);

// The type comes from the file's own bytes, never from its name.
async function checkImage(file: File): Promise<{ error: string } | { width: number; height: number; warning: string | null }> {
  if (!file.size) return { error: "That file is empty. Choose a PNG, JPEG or WebP image." };
  if (file.size > MAX_COVER_BYTES) return { error: `That file is ${(file.size / 1048576).toFixed(1)} MB. Use an image under 2 MB.` };
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const at = (bytes: number[], o = 0) => bytes.every((v, i) => head[o + i] === v);
  const real = at([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) || at([0xff, 0xd8, 0xff]) || (at([0x52, 0x49, 0x46, 0x46]) && at([0x57, 0x45, 0x42, 0x50], 8));
  if (!real) return { error: "That file is not a PNG, JPEG or WebP image. SVG, GIF and other formats are not allowed." };
  let width: number, height: number;
  try {
    const bitmap = await createImageBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
    bitmap.close();
  } catch {
    return { error: "That image cannot be opened. Save it again as a PNG or JPEG and try once more." };
  }
  if (width < MIN_COVER.w || height < MIN_COVER.h) return { error: `The image is ${width} \u00d7 ${height}. Use at least ${MIN_COVER.w} \u00d7 ${MIN_COVER.h}.` };
  const ratio = width / height;
  return { width, height, warning: Math.abs(ratio - 1.6) > 0.06 ? `This image is ${ratio.toFixed(2)}:1. Cards show a 16:10 crop, so check the preview.` : null };
}

// ---- a popup: closes with Escape or a click outside, keeps focus inside, and puts it back afterwards

function Dialog({ labelledBy, wide, onClose, children }: { labelledBy: string; wide?: boolean; onClose: () => void; children: ReactNode }) {
  const card = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = card.current!;
    (el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>("button, a[href], input, textarea"))?.focus({ preventScroll: true });
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close.current(); return; }
      if (e.key !== "Tab") return;
      const items = [...el.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), textarea, [tabindex='0']")];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="overlay scroll" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={card} className={wide ? "card wide" : "card"} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>
  );
}

// ---- one game's popup: the full description, and the button that opens its own site

function Details({ game, canRemove, onRemove, onClose }: { game: ExploreGame; canRemove: boolean; onRemove: () => Promise<void>; onClose: () => void }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function remove() {
    setBusy(true);
    setProblem("");
    try { await onRemove(); } catch (err) { setProblem(err instanceof Error ? err.message : "Could not remove that game"); setBusy(false); }
  }

  return (
    <Dialog labelledBy="explore-detail-title" wide onClose={onClose}>
      <div className="card-head">
        <span className="tag">Hosted elsewhere</span>
        <button type="button" className="link close" aria-label="Close" onClick={onClose}>&#10005;</button>
      </div>
      <div className="art"><img src={exploreCover(game)} alt={`Cover image for ${game.name}`} /></div>
      <div className="explore-detail">
        <h3 id="explore-detail-title">{game.name}</h3>
        <p className="by">by {game.creator}</p>
        <p className="full">{game.description}</p>
        <p className="host-line">{game.host}</p>
        <p className="note">Opens {game.host} in a new tab. start.ng stays open here.</p>
      </div>
      <div className="actions-row">
        {isWebLink(game.url) && <a className="btn" href={game.url} target="_blank" rel="noopener noreferrer" data-autofocus>Play game &#8599;</a>}
        <button type="button" className="ghost" onClick={onClose}>Back to games</button>
      </div>
      {canRemove && !asking && <button type="button" className="link remove" onClick={() => setAsking(true)}>This is my game: remove it</button>}
      {canRemove && asking && (
        <div className="remove-ask">
          <p className="note">Remove {game.name} from the list? Players will no longer see it.</p>
          <div className="actions-row">
            <button type="button" onClick={remove} disabled={busy}>{busy ? "Removing\u2026" : "Yes, remove it"}</button>
            <button type="button" className="ghost" onClick={() => setAsking(false)} disabled={busy}>Keep it</button>
          </div>
        </div>
      )}
      {problem && <p className="error" role="alert">{problem}</p>}
    </Dialog>
  );
}

// ---- the form: five fields, each checked as you go, and again by the server

type Field = "name" | "creator" | "url" | "description" | "cover";
type Errors = Partial<Record<Field, string>>;
type Cover = { file: File; preview: string; width: number; height: number; warning: string | null };
const FIELD_ORDER: Field[] = ["name", "creator", "url", "description", "cover"];

function SubmitForm({ onListed, onView, onClose }: { onListed: (game: ExploreGame, status: string) => void; onView: (id: number) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [creator, setCreator] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<Cover | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ game: ExploreGame; key: string; status: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (cover) URL.revokeObjectURL(cover.preview); }, [cover]);

  const rule = (field: Exclude<Field, "cover">, value: string) =>
    field === "name" ? lengthRule(value, "the name of your game", 2, 40)
    : field === "creator" ? lengthRule(value, "your name or your studio's name", 2, 40)
    : field === "url" ? linkRule(value)
    : descriptionRule(value);
  const setError = (field: Field, message: string | null) => setErrors((e) => ({ ...e, [field]: message ?? undefined }));
  const edit = (field: Exclude<Field, "cover">, value: string, set: (v: string) => void) => {
    set(value);
    if (errors[field]) setError(field, rule(field, value)); // once it has been flagged, say so the moment it is fixed
  };
  const blur = (field: Exclude<Field, "cover">, value: string) => { if (value.trim()) setError(field, rule(field, value)); };
  const focusFirst = (bad: Errors) => {
    const first = FIELD_ORDER.find((f) => bad[f]);
    if (first) document.getElementById(`explore-${first}`)?.focus();
  };

  async function pick(file: File | undefined) {
    setCover(null);
    setError("cover", null);
    if (!file) return;
    const result = await checkImage(file);
    if ("error" in result) { setError("cover", result.error); if (fileInput.current) fileInput.current.value = ""; return; }
    setCover({ file, preview: URL.createObjectURL(file), width: result.width, height: result.height, warning: result.warning });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    const found: Errors = {};
    const checks: [Field, string | null][] = [
      ["name", rule("name", name)], ["creator", rule("creator", creator)], ["url", rule("url", url)], ["description", rule("description", description)],
      ["cover", cover ? null : errors.cover ?? "Add a cover image so your game has a card."],
    ];
    for (const [field, message] of checks) if (message) found[field] = message;
    setErrors(found);
    if (Object.keys(found).length) { focusFirst(found); return; }

    setBusy(true);
    try {
      const res = await submitExploreGame({ name: clean(name), creator: clean(creator), url: url.trim(), description: description.trim(), cover: cover!.file });
      saveKey(res.game.id, res.manage_key);
      setDone({ game: res.game, key: res.manage_key, status: res.status });
      onListed(res.game, res.status);
    } catch (err) {
      if (err instanceof ExploreRefused && Object.keys(err.fields).length) { setErrors(err.fields as Errors); focusFirst(err.fields as Errors); }
      else setFormError(err instanceof ExploreRefused ? err.message : "Something went wrong. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Dialog labelledBy="explore-form-title" wide onClose={onClose}>
        <div className="explore-done">
          <div className="check" aria-hidden="true">&#10003;</div>
          <h3 id="explore-form-title" tabIndex={-1} data-autofocus>Game submitted</h3>
          <p className="lead-sm">{done.status === "approved" ? `${done.game.name} is in the list now.` : `${done.game.name} will appear in the list once a moderator has checked it.`}</p>
          <div className="key-box">
            <span className="key-label">Your removal key</span>
            <code>{done.key}</code>
            <button type="button" className="ghost" onClick={() => navigator.clipboard?.writeText(done.key).then(() => setCopied(true))}>{copied ? "Copied" : "Copy key"}</button>
          </div>
          <p className="note">Keep this key. It is the only way to remove your game, and start.ng cannot show it again. This browser has saved it too.</p>
          <div className="actions-row">
            {done.status === "approved" && <button type="button" onClick={() => onView(done.game.id)}>View in the list</button>}
            <button type="button" className="ghost" onClick={onClose}>Done</button>
          </div>
        </div>
      </Dialog>
    );
  }

  const text = (field: Exclude<Field, "cover">) => ({ id: `explore-${field}`, "aria-invalid": errors[field] ? true : undefined, "aria-describedby": `explore-${field}-err` });
  const oops = (field: Field) => <small className="error" id={`explore-${field}-err`} role="alert">{errors[field]}</small>;

  return (
    <Dialog labelledBy="explore-form-title" wide onClose={onClose}>
      <div className="card-head">
        <h3 id="explore-form-title">Submit your game</h3>
        <button type="button" className="link close" aria-label="Close" onClick={onClose}>&#10005;</button>
      </div>
      <p className="lead-sm">Tell us about a game you have already built and host yourself. Players open it on your site.</p>
      <form className="explore-form" noValidate onSubmit={submit}>
        <label className="field">
          <span>Game name</span>
          <input type="text" autoComplete="off" maxLength={60} placeholder="For example, Tower Stack" value={name} {...text("name")} onChange={(e) => edit("name", e.target.value, setName)} onBlur={() => blur("name", name)} />
          {oops("name")}
        </label>
        <label className="field">
          <span>Creator name</span>
          <input type="text" autoComplete="name" maxLength={60} placeholder="Your name or studio" value={creator} {...text("creator")} onChange={(e) => edit("creator", e.target.value, setCreator)} onBlur={() => blur("creator", creator)} />
          {oops("creator")}
        </label>
        <label className="field">
          <span>Game URL</span>
          <input type="url" inputMode="url" autoComplete="off" placeholder="https://yourgame.com" value={url} {...text("url")} onChange={(e) => edit("url", e.target.value, setUrl)} onBlur={() => blur("url", url)} />
          <small className="hint">The public address where people play it. It must start with https:// or http://</small>
          {!errors.url && httpWarning(url) && <small className="warn">{httpWarning(url)}</small>}
          {oops("url")}
        </label>
        <label className="field">
          <span>Description</span>
          <textarea rows={4} maxLength={600} placeholder="What is the game, and what do players do?" value={description} {...text("description")} onChange={(e) => edit("description", e.target.value, setDescription)} onBlur={() => blur("description", description)} />
          <small className="counter" aria-hidden="true">{description.trim().length} / 500</small>
          {oops("description")}
        </label>
        <div className="field">
          <span>Cover image</span>
          <label className={errors.cover ? "drop bad" : "drop"}>
            <input ref={fileInput} id="explore-cover" className="sr-only" type="file" accept={COVER_TYPES.join(",")} aria-describedby="explore-cover-hint explore-cover-err" aria-invalid={errors.cover ? true : undefined} onChange={(e) => pick(e.target.files?.[0])} />
            <b>Choose an image</b>
            <small className="hint" id="explore-cover-hint">PNG, JPEG or WebP. Up to 2 MB. At least 640 &times; 400, ideally 16:10.</small>
          </label>
          {cover?.warning && <small className="warn">{cover.warning}</small>}
          {oops("cover")}
          {cover && (
            <div className="preview">
              <div className="art"><img src={cover.preview} alt="Preview of your cover image as it appears on a card" /></div>
              <div className="preview-meta">
                <span>{cover.file.name} &middot; {cover.width} &times; {cover.height} &middot; {Math.round(cover.file.size / 1024)} KB</span>
                <button type="button" className="link" onClick={() => { setCover(null); if (fileInput.current) fileInput.current.value = ""; }}>Remove</button>
              </div>
            </div>
          )}
        </div>
        {formError && <p className="error" role="alert">{formError}</p>}
        <div className="actions-row">
          <button type="submit" disabled={busy}>{busy ? "Submitting\u2026" : "Submit game"}</button>
          <button type="button" className="ghost" onClick={onClose} disabled={busy}>Cancel</button>
        </div>
      </form>
    </Dialog>
  );
}

// ---- the page: /explore

/** Games that other people built and host on their own sites. Anyone can list one: no sign-in. */
export default function Explore() {
  const [games, setGames] = useState<ExploreGame[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<ExploreGame | null>(null);
  const [submitting, setSubmitting] = useState(() => new URLSearchParams(location.search).has("submit"));
  const [flash, setFlash] = useState<number | null>(null);
  const [keys, setKeys] = useState(loadKeys);

  useEffect(() => {
    if (new URLSearchParams(location.search).has("submit")) history.replaceState(null, "", location.pathname);
    listExploreGames().then(setGames).catch(() => setError("Couldn't load the games. Try again in a moment."));
  }, []);

  const shown = (games ?? []).filter((g) => matches(g, query));
  const clear = () => setQuery("");

  function listed(game: ExploreGame, status: string) {
    if (status === "approved") setGames((all) => [game, ...(all ?? [])]);
    setKeys(loadKeys());
  }
  function view(id: number) {
    setSubmitting(false);
    setQuery("");
    setFlash(id);
    setTimeout(() => document.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 60);
    setTimeout(() => setFlash(null), 2600);
  }
  async function remove(game: ExploreGame) {
    await removeExploreGame(game.id, keys[game.id]);
    forgetKey(game.id);
    setKeys(loadKeys());
    setGames((all) => (all ?? []).filter((g) => g.id !== game.id));
    setDetail(null);
  }

  return (
    <section className="container explore">
      <div className="section-head">
        <h1>Explore games</h1>
        {games && <span className="count">{games.length} {games.length === 1 ? "game" : "games"}</span>}
      </div>
      <p className="lead-sm">Games from independent creators, hosted on their own sites. Each one opens in a new tab.</p>

      <div className="toolbar">
        <div className="search">
          <input type="search" placeholder="Search by game or creator" aria-label="Search games by name or creator" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape" && query) { e.stopPropagation(); clear(); } }} />
          {query && <button type="button" className="clear" aria-label="Clear search" onClick={clear}>&#10005;</button>}
        </div>
        <button type="button" onClick={() => setSubmitting(true)}>Submit your game</button>
      </div>
      <p className="result-line" aria-live="polite">{games && query.trim() ? `Showing ${shown.length} of ${games.length} games for \u201c${query.trim()}\u201d` : ""}</p>

      {error && <p className="error" role="alert">{error}</p>}
      {games === null && !error && <p className="empty">Loading games&hellip;</p>}
      {games?.length === 0 && <p className="empty">No games here yet. <button type="button" className="link" onClick={() => setSubmitting(true)}>Be the first to list one.</button></p>}
      {games && games.length > 0 && shown.length === 0 && (
        <p className="empty">No games match &ldquo;{query.trim()}&rdquo;. <button type="button" className="link" onClick={clear}>Clear the search</button> or <button type="button" className="link" onClick={() => setSubmitting(true)}>submit a game</button>.</p>
      )}
      <div className="grid">
        {shown.map((g) => (
          <article key={g.id} className={flash === g.id ? "game explore-card flash" : "game explore-card"} data-id={g.id}>
            <div className="art">
              <img src={exploreCover(g)} alt="" loading="lazy" />
              {keys[g.id] && <span className="tag mine badge">Yours</span>}
            </div>
            <div className="info">
              <h3><button type="button" className="card-open" aria-label={`View details: ${g.name}`} onClick={() => setDetail(g)}>{g.name}</button></h3>
              <p>{g.host}</p>
              <span className="by">by {g.creator}</span>
              <p className="desc">{g.description.replace(/\s+/g, " ")}</p>
            </div>
            <div className="meta"><span className="tag">Hosted elsewhere</span><span className="play">View details</span></div>
          </article>
        ))}
      </div>

      {detail && <Details game={detail} canRemove={!!keys[detail.id]} onRemove={() => remove(detail)} onClose={() => setDetail(null)} />}
      {submitting && <SubmitForm onListed={listed} onView={view} onClose={() => setSubmitting(false)} />}
    </section>
  );
}

// ---- the band on the homepage that introduces the page

/** Sits between the Games list and "Got a game?". Shows up to three real covers once there are games. */
export function ExploreBand() {
  const [games, setGames] = useState<ExploreGame[]>([]);
  useEffect(() => { listExploreGames().then(setGames).catch(() => { /* the band works without covers */ }); }, []);
  const tiles = games.slice(0, 3);

  return (
    <section className="container explore-band-wrap" aria-labelledby="explore-band-title">
      <div className={tiles.length ? "explore-band" : "explore-band solo"}>
        <div className="band-text">
          <span className="tag">New</span>
          <h2 id="explore-band-title">Explore games from independent creators</h2>
          <p className="lead-sm">Discover browser games that other developers built and host on their own sites. Read about a game, then play it in a new tab.</p>
          <div className="how-actions">
            <a className="btn" href="/explore">Explore games</a>
            <a className="btn ghost" href="/explore?submit">Submit your game</a>
          </div>
        </div>
        {tiles.length > 0 && (
          <div className="band-covers" aria-hidden="true">
            {tiles.map((g) => <div className="art" key={g.id}><img src={exploreCover(g)} alt="" /></div>)}
          </div>
        )}
      </div>
    </section>
  );
}
