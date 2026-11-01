import { useEffect, useRef, useState } from "react";
import { slug } from "../../markdown";
import type { PagePartProps } from "../registry";
import { browserName, myReports, sendReport, STATUS_LABEL, type MyReport } from "./api";
import "./support.css";

// F10, on every page: a Help button. It searches start.ng's docs (public/docs.md), and lets a signed-in player report
// a problem with start.ng itself. AI answers from the docs come later.

type Section = { title: string; anchor: string; text: string };
let docs: Promise<Section[]> | null = null;

/** The docs split into their sections (## and ### headings), fetched once. */
function loadDocs(): Promise<Section[]> {
  docs ??= fetch("/docs.md").then((r) => (r.ok ? r.text() : "")).then((md) => {
    const out: Section[] = [];
    let cur: Section | null = null;
    for (const line of md.split(/\r?\n/)) { // the file may have Windows line endings
      const h = line.match(/^#{2,3}\s+(.*)$/);
      if (h) {
        cur = { title: h[1].replace(/`/g, ""), anchor: slug(h[1]), text: "" };
        out.push(cur);
      } else if (cur) cur.text += line + "\n";
    }
    return out;
  }).catch(() => []);
  return docs;
}

const words = (q: string) => q.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];

/** The best sections for a question: words in the heading count most. */
function search(sections: Section[], q: string): (Section & { snippet: string })[] {
  const ws = words(q);
  if (!ws.length) return [];
  return sections
    .map((s) => {
      const title = s.title.toLowerCase();
      const body = s.text.toLowerCase();
      const score = ws.reduce((n, w) => n + (title.includes(w) ? 4 : 0) + Math.min(3, body.split(w).length - 1), 0);
      const at = Math.max(0, ws.map((w) => body.indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0);
      const snippet = s.text.slice(Math.max(0, at - 60), at + 160).replace(/[#*`|>[\]]/g, "").replace(/\s+/g, " ").trim();
      return { ...s, score, snippet };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export default function HelpButton({ user, onSignIn }: PagePartProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"search" | "report">("search");
  const [q, setQ] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [what, setWhat] = useState("");
  const [mine, setMine] = useState<MyReport[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const searchTab = useRef<HTMLButtonElement>(null);
  const reportTab = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (open) loadDocs().then(setSections); }, [open]);
  useEffect(() => {
    if (open && tab === "report" && user) myReports().then(setMine).catch(() => setMine([]));
  }, [open, tab, user?.id]);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      helpButton.current?.focus();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  async function report(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    try {
      await sendReport(what.trim(), location.pathname, browserName());
      setWhat("");
      setNote("Thanks! Our team will look at it. If it's a real bug, you get coins.");
      setMine(await myReports());
    } catch (err) { setError(err instanceof Error ? err.message : "That didn't send"); } finally { setBusy(false); }
  }

  function close() {
    setOpen(false);
    requestAnimationFrame(() => helpButton.current?.focus());
  }

  function onTabKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = e.key === "Home" ? "search" : e.key === "End" ? "report" : tab === "search" ? "report" : "search";
    setTab(next);
    (next === "search" ? searchTab : reportTab).current?.focus();
  }

  const results = search(sections, q);
  return (
    <>
      <button ref={helpButton} type="button" className="help-button" aria-expanded={open} aria-controls="help-panel" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">?</span> Help
      </button>
      {open && (
        <div id="help-panel" className="help-panel" role="dialog" aria-label="Help" ref={panel}>
          <div className="help-head">
            <b>Help</b>
            <button type="button" className="help-close" aria-label="Close" onClick={close}>×</button>
          </div>
          <div className="segmented help-tabs" role="tablist" aria-label="Help sections">
            <button ref={searchTab} id="help-tab-search" type="button" role="tab" aria-selected={tab === "search"} aria-controls="help-panel-search" tabIndex={tab === "search" ? 0 : -1} className={tab === "search" ? "on" : ""} onClick={() => setTab("search")} onKeyDown={onTabKey}>Find an answer</button>
            <button ref={reportTab} id="help-tab-report" type="button" role="tab" aria-selected={tab === "report"} aria-controls="help-panel-report" tabIndex={tab === "report" ? 0 : -1} className={tab === "report" ? "on" : ""} onClick={() => setTab("report")} onKeyDown={onTabKey}>Report a problem</button>
          </div>

          {tab === "search" ? (
            <div className="help-body" role="tabpanel" id="help-panel-search" aria-labelledby="help-tab-search">
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. how do I publish a game?" aria-label="Search the docs" autoFocus />
              {q.trim() && results.length === 0 && <p className="note">Nothing in the docs matches. Try other words, or report a problem.</p>}
              <ul className="help-results">
                {results.map((r) => (
                  <li key={r.anchor}>
                    <a href={`/docs#${r.anchor}`}>{r.title}</a>
                    {r.snippet && <p>{r.snippet}…</p>}
                  </li>
                ))}
              </ul>
              {!q.trim() && <p className="note">Search start.ng's docs, or read them all at <a href="/docs">start.ng/docs</a>.</p>}
            </div>
          ) : !user ? (
            <div className="help-body" role="tabpanel" id="help-panel-report" aria-labelledby="help-tab-report">
              <p className="note">Sign in to report a problem with start.ng. If it's a real bug, you get coins.</p>
              <button type="button" onClick={onSignIn}>Sign in</button>
            </div>
          ) : (
            <div className="help-body" role="tabpanel" id="help-panel-report" aria-labelledby="help-tab-report">
              <form onSubmit={report} className="help-report">
                <label htmlFor="help-what">What went wrong with start.ng?</label>
                <textarea id="help-what" value={what} onChange={(e) => setWhat(e.target.value)} rows={4} maxLength={2000} required
                  placeholder="What did you do, what did you expect, and what happened instead?" />
                <p className="note">We also send this page ({location.pathname}) and your browser ({browserName()}), nothing else. For a problem inside one game, report the game on its page.</p>
                <button type="submit" disabled={busy || what.trim().length < 10}>{busy ? "Sending…" : "Send report"}</button>
                {note && <p className="ok" role="status">{note}</p>}
                {error && <p className="error" role="alert">{error}</p>}
              </form>
              {mine && mine.length > 0 && (
                <>
                  <h3 className="help-sub">Your reports</h3>
                  <ul className="help-mine">
                    {mine.map((r) => (
                      <li key={r.id}>
                        <span className={`pill ${r.status === "confirmed" || r.status === "fixed" ? "" : r.status === "new" ? "waiting" : "reported"}`}>{STATUS_LABEL[r.status]}</span>
                        {r.coins > 0 && <span className="help-coins">+{r.coins} coins</span>}
                        <p>{r.what}</p>
                        {r.admin_note && <p className="note">From our team: {r.admin_note}</p>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
