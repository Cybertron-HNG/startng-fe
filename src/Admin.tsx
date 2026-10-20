import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityKind, admin, AdminAccount, adminMe, AdminMe, AdminTournament, AdminTournaments, Developer, GameCard, LogEntry, me,
  Overview, Permission, reasonLabel, Report, ReviewGame, Role, User,
} from "./api";
import { toCard } from "./games";
import ThemeToggle from "./ThemeToggle";
import Boundary from "./features/Boundary";
import { useFeatures } from "./features/flags";
import { allAdminTabs, registerAdminTab, type AdminTabProps } from "./features/registry";

// start.ng/admin. Only admins get past the first check: super admins (SUPER_ADMIN_EMAILS on the API) and the admins
// they add by email. There's no admin sign-up: admins sign in to start.ng with Google, then come here.
// The API checks every permission; this page only hides what an admin's role can't do.

const token = () => localStorage.getItem("token");
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");

function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(() => {
    setError("");
    load().then(setData).catch((e) => setError(e instanceof Error ? e.message : "Couldn't load this"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(reload, [reload]);
  return { data, setData, error, reload };
}

// ---- the confirm dialog every action uses (the browser's own alert/confirm/prompt look out of place)

type Ask = {
  title: string;
  body?: React.ReactNode;
  confirm: string; // the button, e.g. "Hide game"
  danger?: boolean;
  input?: { label: string; placeholder?: string; initial?: string; required?: boolean };
  typeToConfirm?: string; // the admin must type this word first (for things that can't be undone)
};

/** ask(...) opens the dialog and resolves with the text typed ("" with no input), or null when cancelled. */
function useDialog(): [React.ReactNode, (a: Ask) => Promise<string | null>] {
  const [open, setOpen] = useState<(Ask & { resolve: (v: string | null) => void }) | null>(null);
  const ask = useCallback((a: Ask) => new Promise<string | null>((resolve) => setOpen({ ...a, resolve })), []);
  const close = (v: string | null) => { open?.resolve(v); setOpen(null); };
  return [open ? <Dialog key={open.title} ask={open} onClose={close} /> : null, ask];
}

function Dialog({ ask, onClose }: { ask: Ask; onClose: (v: string | null) => void }) {
  const [text, setText] = useState(ask.input?.initial ?? "");
  const [typed, setTyped] = useState("");
  const first = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | null>(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const blocked = (ask.input?.required && !text.trim()) || (ask.typeToConfirm !== undefined && typed !== ask.typeToConfirm);
  return (
    <div className="overlay" onClick={() => onClose(null)}>
      <form className={`card admin-dialog ${ask.danger ? "danger" : ""}`} role="alertdialog" aria-modal="true" aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (!blocked) onClose(text.trim()); }}>
        <div className="card-head">
          <h3 id="dialog-title">{ask.title}</h3>
          <button type="button" className="link close" aria-label="Close" onClick={() => onClose(null)}>✕</button>
        </div>
        {ask.body && <div className="note dialog-body">{ask.body}</div>}
        {ask.input && (
          <label className="dialog-field">
            <span>{ask.input.label}</span>
            <textarea id="dialog-input" ref={(el) => { if (el && !first.current) first.current = el; }} rows={3} maxLength={2000}
              value={text} placeholder={ask.input.placeholder} onChange={(e) => setText(e.target.value)} />
          </label>
        )}
        {ask.typeToConfirm !== undefined && (
          <label className="dialog-field">
            <span>Type <b>{ask.typeToConfirm}</b> to confirm</span>
            <input id="dialog-confirm" ref={(el) => { if (el && !first.current) first.current = el; }} value={typed}
              onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
        )}
        <div className="dialog-actions">
          <button type="button" className="ghost" onClick={() => onClose(null)}>Cancel</button>
          <button type="submit" className={ask.danger ? "danger" : undefined} disabled={blocked}
            ref={(el) => { if (el && !ask.input && ask.typeToConfirm === undefined) first.current = el; }}>{ask.confirm}</button>
        </div>
      </form>
    </div>
  );
}

// ---- the page

export default function Admin() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [access, setAccess] = useState<AdminMe | null | undefined>(undefined);
  const [tab, setTab] = useState<string>(() => location.hash.slice(1) || "overview");
  const isOn = useFeatures();
  const [dialog, ask] = useDialog();

  useEffect(() => {
    document.title = "Admin · start.ng";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    me(token()).then((u) => {
      setUser(u);
      if (u) adminMe(token()).then(setAccess).catch(() => setAccess(null));
      else setAccess(null);
    }).catch(() => { setUser(null); setAccess(null); }); // e.g. a broken saved token: show the sign-in screen
  }, []);

  function go(t: string) {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  }

  if (access === undefined) return <div className="admin-shell"><p className="note">Loading…</p></div>;
  if (!user || !access) {
    return (
      <div className="admin-shell">
        <section className="card admin-gate">
          <h3>start.ng admin</h3>
          {user ? (
            <p className="note">{user.email} isn't an admin. Admins sign in with the Google account a super admin added.</p>
          ) : (
            <p className="note">Sign in to start.ng with your Google account, then come back here.</p>
          )}
          <a className="btn" href="/?signin">{user ? "Use another account" : "Sign in"}</a>
          <a className="link" href="/">Back to start.ng</a>
        </section>
      </div>
    );
  }

  const can = (p: string) => access.is_super || access.permissions.includes(p);
  // Every tab, the admin page's own and each feature's (src/features/registry.ts, registerAdminTab)
  const tabs = allAdminTabs().filter((t) => isOn(t.feature) && (t.superOnly ? access.is_super : !t.permission || can(t.permission)));
  const shown = tabs.find((t) => t.key === tab) ?? tabs[0];

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <a className="logo" href="/">start.ng</a>
        <span className="tag">Admin</span>
        <span className="admin-who">{access.email} · {access.role ?? "No role yet"}</span>
        <ThemeToggle />
      </header>
      <nav className="admin-tabs" aria-label="Admin sections">
        {tabs.map((t) => (
          <button key={t.key} type="button" className={t === shown ? "on" : "ghost"} aria-current={t === shown ? "page" : undefined} onClick={() => go(t.key)}>{t.label}</button>
        ))}
      </nav>
      <main className="admin-main">
        {shown && (
          <Boundary key={shown.key} name={shown.label}>
            <shown.Component access={access} can={can} go={go} ask={ask} />
          </Boundary>
        )}
      </main>
      {dialog}
    </div>
  );
}

function Problem({ error }: { error: string }) {
  return error ? <p className="error" role="alert">{error}</p> : null;
}

/** A game's picture, or its letter tile in its card colours (the same as everywhere on start.ng). */
function GameArt({ g }: { g: GameCard }) {
  const c = toCard({ name: g.name, url: g.url, repo_url: "", by: g.by, updated_at: "", cover_url: g.cover_url, leaderboard: null });
  return (
    <span className="admin-art" style={{ background: `linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})` }}>
      {c.cover ? <img src={c.cover} alt="" loading="lazy" decoding="async" /> : <span>{c.title.charAt(0)}</span>}
    </span>
  );
}

const titleOf = (name: string) => name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

function OverviewTab({ access, go, can }: AdminTabProps) {
  const { data, error } = useLoad<Overview>(() => admin.overview(token()), []);
  return (
    <section>
      <h2>Overview</h2>
      <Problem error={error} />
      {data && (
        <div className="admin-stats">
          <button type="button" className={`ghost stat ${data.games_waiting ? "attention" : ""}`} disabled={!can("reports.view")} onClick={() => go("games")}>
            <b>{data.games_waiting}</b><span>{data.games_waiting === 1 ? "game waiting for review" : "games waiting for review"}</span>
          </button>
          <button type="button" className="ghost stat" disabled={!can("reports.view")} onClick={() => go("games")}><b>{data.hidden_games}</b><span>hidden games</span></button>
          <div className="stat"><b>{data.blocked_developers}</b><span>blocked developers</span></div>
          <button type="button" className="ghost stat" disabled={!access.is_super} onClick={() => go("admins")}><b>{data.admins}</b><span>admins</span></button>
        </div>
      )}
      <p className="note">
        {access.is_super ? "You're a super admin: you can do everything, and add admins and roles." : `Your role lets you: ${access.permissions.join(", ") || "nothing yet. Ask a super admin for a role."}`}
      </p>
    </section>
  );
}

// ---- reports: games waiting for a decision, then hidden games

type AskFn = (a: Ask) => Promise<string | null>;

function ReportsTab({ can, ask }: AdminTabProps) {
  const { data, error, reload } = useLoad<ReviewGame[]>(() => admin.review(token()), []);
  const [devId, setDevId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setActionError("");
    try { await fn(); reload(); } catch (e) { setActionError(e instanceof Error ? e.message : "That didn't work"); } finally { setBusy(false); }
  }

  async function decide(g: ReviewGame, r: Report, outcome: "approved" | "dismissed") {
    const note = await ask(outcome === "approved" ? {
      title: `Hide ${titleOf(g.name)}?`,
      body: <>Approving this report takes the game off start.ng until an admin puts it back. Its developer sees that it's hidden.</>,
      confirm: "Approve and hide", danger: true,
      input: { label: "Note for the team (optional)", placeholder: "What's wrong with it?" },
    } : {
      title: "Dismiss this report?",
      body: <>{titleOf(g.name)} stays on start.ng.</>,
      confirm: "Dismiss report",
      input: { label: "Why (optional)", placeholder: "e.g. It works fine for me" },
    });
    if (note !== null) act(() => admin.closeReport(token(), r.id, outcome, note));
  }

  async function restore(g: ReviewGame) {
    const note = await ask({
      title: `Put ${titleOf(g.name)} back?`,
      body: <>It shows up on start.ng again. Reports still waiting on it are dismissed.</>,
      confirm: "Put back",
      input: { label: "Note (optional)", placeholder: "e.g. The developer fixed it" },
    });
    if (note !== null) act(() => admin.restore(token(), g.name, note));
  }

  async function contact(g: ReviewGame, r: Report) {
    const issue = await ask({
      title: `Contact ${g.developer}`,
      body: <>Reach out to them by email, Slack or anywhere else, then save it here. After 3 issues you can block or delete them.</>,
      confirm: "Save contact",
      input: { label: "What was it about?", initial: `${reasonLabel(r.reason)}${r.details ? `: ${r.details}` : ""}`, required: true },
    });
    if (issue) act(() => admin.contact(token(), g.developer_id, issue, g.name, r.id));
  }

  const waiting = data?.filter((g) => !g.hidden) ?? [];
  const hidden = data?.filter((g) => g.hidden) ?? [];
  const list = (games: ReviewGame[]) => games.map((g) => (
    <article key={g.name} className="admin-item">
      <div className="admin-item-head">
        <GameArt g={g} />
        <div className="admin-item-title">
          <h3><a href={`/games/${g.name}`} target="_blank" rel="noreferrer">{titleOf(g.name)}</a>
            {g.hidden ? <span className={`pill ${g.hidden}`}>hidden · {g.hidden}</span> : <span className="pill waiting">{g.open_reports} waiting</span>}</h3>
          <p className="note">
            by <button type="button" className="link" onClick={() => setDevId(g.developer_id)}>{g.developer}</button>
            {" "}· contacted {g.developer_contacts} of 3{g.hidden_at ? ` · hidden ${when(g.hidden_at)}` : ""}
          </p>
        </div>
        {can("reports.close") && g.hidden && g.hidden !== "blocked" && (
          <button type="button" className="ghost" disabled={busy} onClick={() => restore(g)}>Put back</button>
        )}
      </div>
      <ul className="admin-reports">
        {g.reports.map((r) => (
          <li key={r.id} className={r.status}>
            <div>
              <b>{reasonLabel(r.reason)}</b>{r.details && <> · {r.details}</>}
              <span className="note"> — {r.by_admin ? `flagged by ${r.reporter ?? "an admin"}` : `reported by ${r.reporter ?? "a deleted account"}`}, {when(r.created_at)}</span>
              {r.status !== "open" && !r.by_admin && <span className="note"> · {r.status} by {r.closed_by}{r.note ? `: ${r.note}` : ""}</span>}
            </div>
            {r.status === "open" && (
              <div className="row-actions">
                {can("reports.close") && <button type="button" className="danger small" disabled={busy} onClick={() => decide(g, r, "approved")}>Approve and hide</button>}
                {can("reports.close") && <button type="button" className="ghost small" disabled={busy} onClick={() => decide(g, r, "dismissed")}>Dismiss</button>}
                {can("developers.contact") && <button type="button" className="link" disabled={busy} onClick={() => contact(g, r)}>Contact developer</button>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </article>
  ));

  return (
    <section>
      <h2>Waiting for review</h2>
      <p className="note">Players' reports wait here. The game stays up until an admin approves a report, which hides it.</p>
      <Problem error={error || actionError} />
      {data && waiting.length === 0 && <p className="empty">No reports waiting. All clear.</p>}
      <div className="admin-list">{list(waiting)}</div>
      <h2>Hidden games</h2>
      <p className="note">Off start.ng after an approved report, an admin's flag, or because their developer is blocked.</p>
      {data && hidden.length === 0 && <p className="empty">Nothing's hidden.</p>}
      <div className="admin-list">{list(hidden)}</div>
      {devId !== null && <DeveloperDialog id={devId} can={can} ask={ask} onClose={() => { setDevId(null); reload(); }} />}
    </section>
  );
}

function DeveloperDialog({ id, can, ask, onClose }: { id: number; can: (p: string) => boolean; ask: AskFn; onClose: () => void }) {
  const { data, setData, error } = useLoad<Developer>(() => admin.developer(token(), id), [id]);
  const [issue, setIssue] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<Developer | void>, after?: () => void) {
    setBusy(true);
    setActionError("");
    try { const d = await fn(); if (d) setData(d); after?.(); } catch (e) { setActionError(e instanceof Error ? e.message : "That didn't work"); } finally { setBusy(false); }
  }

  const name = data ? data.name ?? data.email : "";
  async function block() {
    if (await ask({ title: `Block ${name}?`, body: <>They can't sign in or publish, and all {data!.games.length} of their games are hidden. You can unblock them later.</>, confirm: "Block developer", danger: true }) !== null)
      act(() => admin.block(token(), id));
  }
  async function remove() {
    if (await ask({ title: `Delete ${name}?`, body: <>This deletes their account and all {data!.games.length} of their games (files, scores and plays) for good. It can't be undone.</>,
      confirm: "Delete for good", danger: true, typeToConfirm: "DELETE" }) !== null)
      act(() => admin.deleteDeveloper(token(), id), onClose);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card admin-dev" role="dialog" aria-modal="true" aria-labelledby="dev-title" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h3 id="dev-title">{name || "Developer"}</h3>
          <button type="button" className="link close" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <Problem error={error || actionError} />
        {data && (
          <>
            <p className="note">{data.email}{data.blocked_at ? ` · blocked ${when(data.blocked_at)}` : ""}</p>
            <p className="note">Games: {data.games.join(", ") || "none"}</p>
            <div className="strikes" aria-label={`Contacted about ${data.contacts.length} of ${data.contacts_needed} issues`}>
              {Array.from({ length: data.contacts_needed }, (_, i) => <span key={i} className={`strike ${i < data.contacts.length ? "on" : ""}`}>{i + 1}</span>)}
              <span className="note">{data.can_block ? "Block and delete are unlocked" : `Contacted about ${data.contacts.length} of ${data.contacts_needed} issues`}</span>
            </div>
            <ul className="admin-contacts">
              {data.contacts.map((c) => <li key={c.id}>{c.issue} <span className="note">— {c.admin_email}, {when(c.created_at)}{c.game_name ? ` · ${c.game_name}` : ""}</span></li>)}
            </ul>
            {can("developers.contact") && (
              <form className="admin-inline" onSubmit={(e) => { e.preventDefault(); if (issue.trim()) act(() => admin.contact(token(), id, issue.trim(), null, null), () => setIssue("")); }}>
                <input id="contact-issue" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="What did you reach out about?" maxLength={2000} />
                <button type="submit" disabled={busy || issue.trim().length < 3}>Record</button>
              </form>
            )}
            <div className="row-actions">
              {can("developers.block") && (data.blocked_at ? (
                <button type="button" className="ghost" disabled={busy} onClick={() => act(() => admin.unblock(token(), id))}>Unblock</button>
              ) : (
                <button type="button" className="ghost" disabled={busy || !data.can_block} title={data.can_block ? "" : `Reach out about ${data.contacts_needed} issues first`} onClick={block}>Block developer</button>
              ))}
              {can("developers.delete") && (
                <button type="button" className="danger" disabled={busy || !data.can_block} title={data.can_block ? "" : `Reach out about ${data.contacts_needed} issues first`} onClick={remove}>Delete developer and games</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- tournaments: the current one and the next, before players see them

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

function span(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d ? `${d}d ` : ""}${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function Countdowns({ t }: { t: AdminTournament }) {
  const now = useNow();
  const start = new Date(t.starts_at).getTime(), end = new Date(t.ends_at).getTime();
  return (
    <div className="countdowns">
      <div className="countdown">
        <span className="label">{now < start ? "Starts in" : "Started"}</span>
        <b>{now < start ? span(start - now) : when(t.starts_at)}</b>
        {now < start && <span className="note">{when(t.starts_at)}</span>}
      </div>
      <div className="countdown">
        <span className="label">{now < end ? "Ends in" : "Ended"}</span>
        <b>{now < end ? span(end - now) : when(t.ends_at)}</b>
        {now < end && <span className="note">{when(t.ends_at)}</span>}
      </div>
    </div>
  );
}

function TournamentsTab({ can, ask }: AdminTabProps) {
  const { data, setData, error } = useLoad<AdminTournaments>(() => admin.tournaments(token()), []);
  const [editing, setEditing] = useState<{ id: number; games: string[] } | null>(null);
  const [actionError, setActionError] = useState("");

  async function save(fn: () => Promise<AdminTournaments>) {
    setActionError("");
    try { setData(await fn()); setEditing(null); } catch (e) { setActionError(e instanceof Error ? e.message : "That didn't work"); }
  }

  async function reroll(t: AdminTournament) {
    if (await ask({ title: "Pick new games?", body: <>start.ng picks new random games for this tournament. The ones you see now are replaced.</>, confirm: "Pick again" }) !== null)
      save(() => admin.reroll(token(), t.id));
  }

  return (
    <section>
      <h2>Tournaments</h2>
      <p className="note">The tournament that's on now and the one after it. Players see a countdown to the next one, but its games stay hidden until it starts. You can change them until then.</p>
      <Problem error={error || actionError} />
      {data && data.tournaments.length === 0 && <p className="empty">Not enough games qualify for a tournament (at least {data.min_games}).</p>}
      <div className="admin-list">
        {data?.tournaments.map((t) => (
          <article key={t.id} className={`admin-item tournament ${t.started ? "on" : ""}`}>
            <div className="admin-item-head">
              <div className="admin-item-title">
                <h3>{t.started ? "On now" : "Next"} <span className={`pill ${t.started ? "live" : ""}`}>{t.started ? "live" : "not started"}</span></h3>
              </div>
              {can("tournaments.edit") && !t.started && editing?.id !== t.id && (
                <div className="row-actions">
                  <button type="button" className="ghost" onClick={() => setEditing({ id: t.id, games: t.games.map((g) => g.name) })}>Change games</button>
                  <button type="button" className="ghost" onClick={() => reroll(t)}>Pick again</button>
                </div>
              )}
            </div>
            <Countdowns t={t} />
            {editing?.id === t.id ? (
              <GamePicker data={data} chosen={editing.games} onChange={(games) => setEditing({ id: t.id, games })}
                onSave={() => save(() => admin.setTournamentGames(token(), t.id, editing.games))} onCancel={() => setEditing(null)} />
            ) : (
              <div className="admin-game-grid">
                {t.games.map((g) => (
                  <a key={g.name} className="admin-game" href={`/games/${g.name}`} target="_blank" rel="noreferrer">
                    <GameArt g={g} />
                    <span className="admin-game-name">{titleOf(g.name)}</span>
                    <span className="note">by {g.by}</span>
                    {g.hidden && <span className={`pill ${g.hidden}`}>hidden</span>}
                  </a>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function GamePicker({ data, chosen, onChange, onSave, onCancel }: {
  data: AdminTournaments; chosen: string[]; onChange: (g: string[]) => void; onSave: () => void; onCancel: () => void;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.eligible.filter((g) => !s || g.name.includes(s) || g.by.toLowerCase().includes(s));
  }, [data.eligible, q]);
  const ok = chosen.length >= data.min_games && chosen.length <= data.max_games;
  return (
    <div className="picker">
      <p className="note">
        Every game that can be in a tournament: it keeps a leaderboard, meets the game standards, isn't hidden, and isn't the Hangout.
        Pick {data.min_games} to {data.max_games}. <b>{chosen.length} chosen.</b>
      </p>
      <input id="picker-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${data.eligible.length} games`} aria-label="Search games" />
      <div className="admin-game-grid">
        {shown.map((g) => {
          const on = chosen.includes(g.name);
          const full = !on && chosen.length >= data.max_games;
          return (
            <button key={g.name} type="button" className={`admin-game pick ${on ? "on" : ""}`} aria-pressed={on} disabled={full}
              onClick={() => onChange(on ? chosen.filter((x) => x !== g.name) : [...chosen, g.name])}>
              <GameArt g={g} />
              <span className="admin-game-name">{titleOf(g.name)}</span>
              <span className="note">by {g.by}</span>
              {on && <span className="picked">✓ {chosen.indexOf(g.name) + 1}</span>}
            </button>
          );
        })}
        {shown.length === 0 && <p className="empty">No games match “{q}”.</p>}
      </div>
      <div className="row-actions picker-actions">
        <button type="button" disabled={!ok} onClick={onSave}>Save {chosen.length} games</button>
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ---- admins and roles (super admins only)

function AdminsTab({ ask }: AdminTabProps) {
  const roles = useLoad<Role[]>(() => admin.roles(token()), []);
  const admins = useLoad<AdminAccount[]>(() => admin.admins(token()), []);
  const perms = useLoad<Permission[]>(() => admin.permissions(token()), []);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<number | null>(null);
  const [role, setRole] = useState<{ id: number | null; name: string; permissions: string[] } | null>(null);
  const [actionError, setActionError] = useState("");

  async function act(fn: () => Promise<unknown>, after?: () => void) {
    setActionError("");
    try { await fn(); after?.(); roles.reload(); admins.reload(); } catch (e) { setActionError(e instanceof Error ? e.message : "That didn't work"); }
  }

  return (
    <section>
      <h2>Admins</h2>
      <p className="note">Add someone by the email of their Google account. They sign in to start.ng with it and open /admin. There's no admin sign-up.</p>
      <Problem error={admins.error || roles.error || actionError} />
      <form className="admin-inline" onSubmit={(e) => { e.preventDefault(); act(() => admin.addAdmin(token(), email.trim(), roleId), () => setEmail("")); }}>
        <input id="new-admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" />
        <select id="new-admin-role" value={roleId ?? ""} onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">No role yet</option>
          {roles.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button type="submit">Add admin</button>
      </form>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Email</th><th>Role</th><th>Signed in yet</th><th /></tr></thead>
        <tbody>
          {admins.data?.map((a) => (
            <tr key={a.email}>
              <td>{a.email}</td>
              <td>
                {a.is_super ? "Super admin" : (
                  <select aria-label={`Role for ${a.email}`} value={a.role_id ?? ""} onChange={(e) => act(() => admin.setAdminRole(token(), a.id!, e.target.value ? Number(e.target.value) : null))}>
                    <option value="">No role</option>
                    {roles.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
              </td>
              <td>{a.signed_up ? "Yes" : "Not yet"}</td>
              <td>{!a.is_super && <button type="button" className="link" onClick={async () => {
                if (await ask({ title: `Remove ${a.email}?`, body: <>They lose admin access straight away.</>, confirm: "Remove admin", danger: true }) !== null)
                  act(() => admin.removeAdmin(token(), a.id!));
              }}>Remove</button>}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <p className="note">Super admins are set on the server (SUPER_ADMIN_EMAILS) and can't be removed here.</p>

      <h2>Roles</h2>
      <div className="row-actions">
        <button type="button" className="ghost" onClick={() => setRole({ id: null, name: "", permissions: [] })}>New role</button>
      </div>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Role</th><th>Can</th><th>Admins</th><th /></tr></thead>
        <tbody>
          {roles.data?.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.permissions.join(", ") || "nothing"}</td>
              <td>{r.admins}</td>
              <td className="row-actions">
                <button type="button" className="link" onClick={() => setRole({ id: r.id, name: r.name, permissions: r.permissions })}>Edit</button>
                <button type="button" className="link" onClick={async () => {
                  if (await ask({ title: `Delete the ${r.name} role?`, body: <>Its {r.admins} admins keep their place but can do nothing until they get another role.</>, confirm: "Delete role", danger: true }) !== null)
                    act(() => admin.deleteRole(token(), r.id));
                }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {roles.data?.length === 0 && <p className="empty">No roles yet. Make one, then give it to admins.</p>}

      {role && (
        <div className="overlay" onClick={() => setRole(null)}>
          <form className="card admin-role" role="dialog" aria-modal="true" aria-labelledby="role-title" onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); act(() => role.id ? admin.updateRole(token(), role.id, role.name, role.permissions) : admin.createRole(token(), role.name, role.permissions), () => setRole(null)); }}>
            <div className="card-head">
              <h3 id="role-title">{role.id ? "Edit role" : "New role"}</h3>
              <button type="button" className="link close" aria-label="Close" onClick={() => setRole(null)}>✕</button>
            </div>
            <input id="role-name" required minLength={2} maxLength={40} value={role.name} onChange={(e) => setRole({ ...role, name: e.target.value })} placeholder="e.g. Moderator" />
            <fieldset className="perms">
              <legend>What it can do</legend>
              {perms.data?.map((p) => (
                <label key={p.key}>
                  <input type="checkbox" checked={role.permissions.includes(p.key)}
                    onChange={(e) => setRole({ ...role, permissions: e.target.checked ? [...role.permissions, p.key] : role.permissions.filter((x) => x !== p.key) })} />
                  <span><b>{p.label}</b> <code>{p.key}</code></span>
                </label>
              ))}
            </fieldset>
            <Problem error={actionError} />
            <button type="submit">Save role</button>
          </form>
        </div>
      )}
    </section>
  );
}

// ---- activity: everything that happens on start.ng

const KINDS: [ActivityKind | null, string][] = [[null, "Everything"], ["player", "Players"], ["developer", "Developers"], ["admin", "Admins"], ["system", "start.ng"]];

function describe(e: LogEntry): React.ReactNode {
  const who = <b>{e.actor ?? "start.ng"}</b>;
  const game = e.target ? <a href={`/games/${e.target}`} target="_blank" rel="noreferrer">{e.target}</a> : null;
  const d = (e.detail ?? {}) as Record<string, string | string[] | number | null>;
  switch (e.action) {
    case "account.created": return <>{who} made an account{d.via ? ` with ${d.via}` : ""}</>;
    case "game.published": return <>{who} published {game}</>;
    case "game.updated": return <>{who} published a new version of {game}</>;
    case "game.auto_updated": return <>start.ng updated {game} from a new push{d.commit ? ` (${d.commit})` : ""}</>;
    case "game.update_failed": return <>A push to {game} couldn't go live{d.detail ? `: ${d.detail}` : ""}</>;
    case "game.removed": return <>{who} took {e.target} offline</>;
    case "game.cover_changed": return <>{who} changed the cover of {game}</>;
    case "game.cover_removed": return <>{who} removed the cover of {game}</>;
    case "score.removed": return <>{who} removed a score from {game}</>;
    case "indie.added": return <>{who} added {e.target} to Creators</>;
    case "indie.removed": return <>{who} removed {e.target} from Creators</>;
    case "game.reported": return <>{who} reported {game}{d.reason ? ` (${reasonLabel(String(d.reason))})` : ""}</>;
    case "report.approved": return <>{who} approved a report on {game} and hid it</>;
    case "report.dismissed": return <>{who} dismissed a report on {game}</>;
    case "game.flagged": return <>{who} flagged {game} and hid it{d.reason ? ` (${reasonLabel(String(d.reason))})` : ""}</>;
    case "game.restored": return <>{who} put {game} back</>;
    case "developer.contact": return <>{who} reached out to {e.target}{d.game ? ` about ${d.game}` : ""}</>;
    case "developer.block": return <>{who} blocked {e.target}</>;
    case "developer.unblock": return <>{who} unblocked {e.target}</>;
    case "developer.delete": return <>{who} deleted {e.target} and their games</>;
    case "admin.add": return <>{who} added {e.target} as an admin</>;
    case "admin.role": return <>{who} changed the role of {e.target}</>;
    case "admin.remove": return <>{who} removed {e.target} as an admin</>;
    case "role.create": return <>{who} made the role {e.target}</>;
    case "role.update": return <>{who} changed the role {e.target}</>;
    case "role.delete": return <>{who} deleted the role {e.target}</>;
    case "tournament.created": return <>start.ng picked the games for the tournament starting {e.target}{Array.isArray(d.games) ? `: ${d.games.join(", ")}` : ""}</>;
    case "tournament.finished": return <>The tournament of {e.target} ended{d.winner ? `. Winner: ${d.winner}` : " with no players"}</>;
    case "tournament.entered": return <>{who} entered the tournament</>;
    case "tournament.games": return <>{who} changed the games of the next tournament{Array.isArray(d.after) ? `: ${d.after.join(", ")}` : ""}</>;
    case "tournament.reroll": return <>{who} picked new games for the next tournament{Array.isArray(d.after) ? `: ${d.after.join(", ")}` : ""}</>;
    default: return <>{who} {e.action} {e.target}</>;
  }
}

function LogTab(_: AdminTabProps) {
  const [kind, setKind] = useState<ActivityKind | null>(null);
  const { data, setData, error } = useLoad<LogEntry[]>(() => admin.log(token(), kind), [kind]);
  const [more, setMore] = useState(true);
  useEffect(() => setMore(true), [kind]);
  async function older() {
    if (!data?.length) return;
    const next = await admin.log(token(), kind, data[data.length - 1].id);
    setMore(next.length > 0);
    setData([...data, ...next]);
  }
  return (
    <section>
      <h2>Activity</h2>
      <p className="note">Everything that happens on start.ng, newest first.</p>
      <div className="chips" role="group" aria-label="Show">
        {KINDS.map(([k, label]) => <button key={label} type="button" className={kind === k ? "on" : ""} aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>)}
      </div>
      <Problem error={error} />
      <ol className="activity">
        {data?.map((e) => (
          <li key={e.id} className={e.kind}>
            <span className={`kind ${e.kind}`}>{e.kind === "system" ? "start.ng" : e.kind}</span>
            <span className="what">{describe(e)}</span>
            <time dateTime={e.at}>{when(e.at)}</time>
          </li>
        ))}
      </ol>
      {data?.length === 0 && <p className="empty">Nothing yet.</p>}
      {data && data.length >= 100 && more && <button type="button" className="ghost" onClick={older}>Older</button>}
    </section>
  );
}

// The admin page's own tabs. Features add theirs from their own folder (src/features/registry.ts, registerAdminTab).
registerAdminTab({ feature: null, key: "overview", label: "Overview", order: 0, Component: OverviewTab });
registerAdminTab({ feature: null, key: "games", label: "Reports", order: 10, permission: "reports.view", Component: ReportsTab });
registerAdminTab({ feature: null, key: "tournaments", label: "Tournaments", order: 20, permission: "tournaments.view", Component: TournamentsTab });
registerAdminTab({ feature: null, key: "admins", label: "Admins & roles", order: 900, superOnly: true, Component: AdminsTab });
registerAdminTab({ feature: null, key: "log", label: "Activity", order: 1000, permission: "log.view", Component: LogTab });
