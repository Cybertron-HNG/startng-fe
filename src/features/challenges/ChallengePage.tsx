import { useEffect, useState } from "react";
import type { PageProps } from "../registry";
import { AvatarFace } from "../../Avatar";
import ShareButton from "../share_cards/ShareButton";
import { acceptChallenge, deleteChallenge, getChallenge, type Attempt, type Challenge } from "./api";

function standing(c: Challenge, a: Attempt): string {
  if (a.beaten) return "You beat it!";
  if (a.short_by === null) return "No run yet. Play to take it on.";
  const gap = c.game.stat.format === "time" ? `${Math.floor(a.short_by / 60)}:${String(a.short_by % 60).padStart(2, "0")}` : a.short_by.toLocaleString();
  return `Your best: ${a.best_text}. ${gap} short.`;
}

/** start.ng/c/<code>: "Loki scored 4,200 on Relic Hunter. Can you beat it?" Play takes it on (sign-in first). */
export default function ChallengePage({ user, onSignIn, params }: PageProps) {
  const code = params.code;
  const [c, setC] = useState<Challenge | null | undefined>(undefined); // null: expired or deleted
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = () => getChallenge(code).then(setC).catch((e) => (e?.status === 404 ? setC(null) : setError("Couldn't load this challenge. Try again in a moment.")));
    load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000); // a friend's runs come in
    return () => window.clearInterval(timer);
  }, [code, user?.id]);
  useEffect(() => { if (c) document.title = `${c.challenger.name} challenges you on ${c.game.title} · start.ng`; }, [c]);

  async function play() {
    if (!c) return;
    if (!user) return onSignIn(); // a score only counts signed in
    setBusy(true);
    setError("");
    // Synchronously initiate window open on user tap to satisfy iOS Safari user gesture security policy
    const tab = window.open(c.game.url, "_blank", "noopener");
    try {
      if (!c.mine) setC(await acceptChallenge(code));
      // Fallback if popup blocker intercepted new window
      if (!tab || tab.closed) {
        location.assign(c.game.url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this challenge? Its link stops working.")) return;
    try {
      await deleteChallenge(code);
      location.assign("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  if (c === undefined) return <section className="container"><p className="note">{error || "Loading…"}</p></section>;
  if (c === null) {
    return (
      <section className="container">
        <h1>This challenge has ended</h1>
        <p className="note">Challenge links last 30 days, and the player who made it can delete it.</p>
        <p><a className="btn" href="/games">Play games on start.ng</a></p>
      </section>
    );
  }

  return (
    <section className="container challenge-page">
      <div className={`challenge-card${c.game.cover_url ? " with-cover" : ""}`}>
        {c.game.cover_url && <img className="challenge-cover" src={c.game.cover_url} alt="" />}
        <div className="challenge-body">
          <p className="eyebrow">Challenge</p>
          <h1>
            {c.challenger.character && <AvatarFace style={c.challenger.character.style} size={44} />}
            <span>{c.mine ? "You" : c.challenger.name} scored <b>{c.score_text}</b> on {c.game.title}.</span>
          </h1>
          <p className="challenge-ask">{c.mine ? "Send the link to a friend and see if they can beat it." : "Can you beat it?"}</p>
          {c.me && <p className={`challenge-standing${c.me.beaten ? " won" : ""}`}>{standing(c, c.me)}</p>}
          {error && <p className="error">{error}</p>}
          <div className="share-row">
            <button type="button" onClick={play} disabled={busy}>{user ? (c.mine ? `Play ${c.game.title}` : c.me ? "Play again" : "Take the challenge") : "Sign in to take it on"}</button>
            {c.mine && <button type="button" className="ghost" onClick={remove}>Delete</button>}
          </div>
          {c.mine && <ShareButton kind="challenge" id={c.code} label="Send to a friend" intro="Send it to a friend" />}
        </div>
      </div>

      {c.mine && (
        <section aria-labelledby="takers-heading">
          <h2 id="takers-heading">Who took it on</h2>
          {c.attempts.length === 0 ? <p className="note">Nobody yet.</p> : (
            <ul className="private-list">
              {c.attempts.map((a) => (
                <li key={a.player.id}>
                  <span>{a.player.name}</span>
                  <span className={a.beaten ? "tag" : "note"}>{a.beaten ? `Beat it: ${a.best_text}` : a.best_text ? `Best ${a.best_text}` : "No run yet"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className="note">Ends {new Date(c.expires_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}. Only runs after you take it on count.</p>
    </section>
  );
}
