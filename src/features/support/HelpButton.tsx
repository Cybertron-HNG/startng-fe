import { useEffect, useRef, useState } from "react";
import { slug } from "../../markdown";
import type { PagePartProps } from "../registry";
import { browserName, myReports, sendReport, STATUS_LABEL, type MyReport } from "./api";
import "./support.css";

// F10, on every page: a Help button. It searches start.ng's docs (public/docs.md), and lets a signed-in player report
// a problem with start.ng itself. AI answers from the docs come later.

type Section = { title: string; anchor: string; text: string };

/** The FAQ's gamepad mark: help about games, not a question-mark button. */
function GamepadIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.6 8h8.8a4.4 4.4 0 0 1 4.3 5.3l-.6 2.7a2.3 2.3 0 0 1-4 1L14.7 15H9.3l-1.4 2a2.3 2.3 0 0 1-4-1l-.6-2.7A4.4 4.4 0 0 1 7.6 8Z" />
      <path d="M8 11.2v2M7 12.2h2M15.6 11.6h.01M17.6 13.2h.01" />
    </svg>
  );
}
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

  useEffect(() => { if (open) loadDocs().then(setSections); }, [open]);
  useEffect(() => {
    if (open && tab === "report" && user) myReports().then(setMine).catch(() => setMine([]));
  }, [open, tab, user?.id]);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
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

  const results = search(sections, q);
  // The FAQ list shown before anyone types: game pages first, then the rest of the docs.
  const faq = [...sections]
    .sort((a, b) => Number(/game page/i.test(b.title)) - Number(/game page/i.test(a.title)))
    .slice(0, 6);
  return (
    <>
      <button type="button" className="help-button" aria-expanded={open} aria-controls="help-panel" onClick={() => setOpen((o) => !o)}>
        <span className="help-badge" aria-hidden="true"><GamepadIcon /></span>
        <span>Help</span>
      </button>
      {open && (
        <div id="help-panel" className="help-panel" role="dialog" aria-label="Help" ref={panel}>
          <div className="help-head">
            <div className="help-head-main">
              <span className="help-pad" aria-hidden="true"><GamepadIcon size={20} /></span>
              <div>
                <b>Help</b>
                <p className="help-kicker">Answers about start.ng, and a way to tell us what broke.</p>
              </div>
            </div>
            <button type="button" className="help-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="segmented help-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "search"} className={tab === "search" ? "on" : ""} onClick={() => setTab("search")}>Answers</button>
            <button type="button" role="tab" aria-selected={tab === "report"} className={tab === "report" ? "on" : ""} onClick={() => setTab("report")}>Report a problem</button>
          </div>

          {tab === "search" ? (
            <div className="help-body">
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. how do I publish a game?" aria-label="Search the docs" autoFocus />
              {q.trim() && results.length === 0 && <p className="note">Nothing in the docs matches. Try other words, or report a problem.</p>}
              {q.trim() ? (
                <ul className="help-results">
                  {results.map((r) => (
                    <li key={r.anchor}>
                      <a href={`/docs#${r.anchor}`}>{r.title}</a>
                      {r.snippet && <p>{r.snippet}…</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="help-faq">
                  {faq.map((f) => (
                    <li key={f.anchor}>
                      <a href={`/docs#${f.anchor}`}>
                        <span>{f.title}</span>
                        <i aria-hidden="true">→</i>
                      </a>
                    </li>
                  ))}
                  {sections.length === 0 && <li className="help-faq-empty">Loading the questions…</li>}
                </ul>
              )}
              <p className="note">Every answer lives in <a href="/docs">start.ng/docs</a>. Missing something? Report a problem.</p>
            </div>
          ) : !user ? (
            <div className="help-body">
              <p className="note">Sign in to report a problem with start.ng. If it's a real bug, you get coins.</p>
              <button type="button" onClick={onSignIn}>Sign in</button>
            </div>
          ) : (
            <div className="help-body">
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
