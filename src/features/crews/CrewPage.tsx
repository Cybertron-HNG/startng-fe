import { useEffect, useState } from "react";
import type { PageProps } from "../registry";
import { shortName } from "../../BoardTable";
import { PAGES, setSeo } from "../../seo";
import { useFeature } from "../flags";
import { crewTournaments, Summary } from "../private_tournaments/api";
import { timeLeft } from "../private_tournaments/time";
import { Crew, deleteCrew, getCrew, leaveCrew, newCrewLink, removeMember } from "./api";

/** start.ng/crews/<id>: who is in the crew, its invite link, and leave or manage. */
export default function CrewPage({ user, onSignIn, params }: PageProps) {
  const id = Number(params.id);
  const [crew, setCrew] = useState<Crew | null | undefined>(undefined); // null: not found, or not yours
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const withTournaments = useFeature("private_tournaments");
  const [cups, setCups] = useState<Summary[]>([]);
  const link = crew ? `${location.origin}/join/${crew.code}` : "";
  const canShare = typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches; // phones and tablets

  useEffect(() => setSeo(crew ? { ...PAGES.crew, title: `${crew.name} · crew · start.ng` } : PAGES.crew), [crew]);
  useEffect(() => {
    if (!user) { setCrew(null); return; }
    getCrew(id).then(setCrew).catch(() => setCrew(null));
  }, [id, user?.id]);

  useEffect(() => {
    if (withTournaments && crew) crewTournaments(id).then(setCups).catch(() => setCups([]));
  }, [withTournaments, crew?.id]);

  async function act(fn: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setError("");
    try {
      await fn();
      after ? after() : setCrew(await getCrew(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* the address is on the page */ }
  }

  async function share() {
    try {
      await navigator.share({ title: crew?.name, text: `Join my crew "${crew?.name}" on start.ng!`, url: link });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") copy();
    }
  }

  if (crew === undefined) return <section className="container tournament-page"><p className="board-sub">Loading…</p></section>;
  if (crew === null) {
    return (
      <section className="container tournament-page">
        <p className="empty">{user ? <>This crew isn't yours to see. <a href="/crews">Your crews</a></> : <>Sign in to see your crews. <button type="button" className="link" onClick={onSignIn}>Sign in</button></>}</p>
      </section>
    );
  }

  const whatsapp = `https://wa.me/?${new URLSearchParams({ text: `Join my crew "${crew.name}" on start.ng! ${link}` })}`;
  return (
    <section className="container tournament-page">
      <div className="section-head">
        <div>
          <h1>{crew.name}</h1>
          <p className="tournament-sub">{crew.kind[0].toUpperCase() + crew.kind.slice(1)} crew · {crew.members} {crew.members === 1 ? "person" : "people"} · <a href="/crews">Your crews →</a></p>
        </div>
      </div>

      <div className="tournament-status">
        <div>
          <span className="tag">Invite link</span>
          <p><code className="crew-link">{link}</code></p>
          <p className="note">Anyone with this link can join, up to 200 people. {crew.mine ? "If it gets passed around too far, make a new one: the old link stops working and everyone who joined stays in." : ""}</p>
        </div>
        <div className="tournament-enter">
          <div className="private-share">
            {canShare && <button type="button" onClick={share}>Share the link</button>}
            <a className={canShare ? "btn ghost" : "btn"} href={whatsapp} target="_blank" rel="noreferrer">Invite on WhatsApp</a>
            <button type="button" className="ghost" onClick={copy}>{copied ? "Link copied" : "Copy link"}</button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      </div>

      {withTournaments && (
        <section aria-labelledby="cups-heading">
          <h2 id="cups-heading" className="private-heading">Tournaments</h2>
          {cups.length === 0 && <p className="board-empty">None yet. Pick the games and a time, and everyone in the crew can join.</p>}
          <ul className="private-list">
            {cups.map((t) => (
              <li key={t.code}>
                <a href={`/friends/${t.code}`}>
                  <b>{t.title}</b>
                  <span>{t.games.length} {t.games.length === 1 ? "game" : "games"} · {t.members} {t.members === 1 ? "player" : "players"}{t.joined ? " · you're in" : ""}</span>
                </a>
                <span className={`tag ${t.finished ? "done" : ""}`}>{timeLeft(t.ends_at)}</span>
              </li>
            ))}
          </ul>
          <p><a className="btn" href={`/friends?crew=${crew.id}`}>Start a tournament for this crew</a></p>
        </section>
      )}

      <section aria-labelledby="people-heading">
        <h2 id="people-heading" className="private-heading">People</h2>
        <ul className="private-list">
          {crew.people.map((p) => (
            <li key={p.player_id}>
              <span className="nm" title={p.name}><span className="dot" style={{ background: p.color ?? "var(--line)" }} /> <b>{shortName(p.name)}</b>{p.player_id === user?.id && <em> (you)</em>}</span>
              {p.owner ? <span className="tag">Made it</span> : crew.mine && (
                <button type="button" className="link" disabled={busy} onClick={() => { if (confirm(`Remove ${p.name} from the crew?`)) act(() => removeMember(id, p.player_id)); }}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="private-manage">
        {crew.mine ? (
          <>
            <button type="button" className="link" disabled={busy} onClick={() => {
              if (confirm("Make a new invite link? The old link stops working. Everyone who has joined stays in.")) act(() => newCrewLink(id));
            }}>New invite link</button>
            {" "}
            <button type="button" className="link flag" disabled={busy} onClick={() => { if (confirm("Delete this crew for everyone?")) act(() => deleteCrew(id), () => location.assign("/crews")); }}>Delete crew</button>
          </>
        ) : (
          <button type="button" className="link" disabled={busy} onClick={() => { if (confirm("Leave this crew?")) act(() => leaveCrew(id), () => location.assign("/crews")); }}>Leave crew</button>
        )}
      </div>
    </section>
  );
}
