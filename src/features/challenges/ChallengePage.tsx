import { useEffect, useState } from "react";
import type { PageProps } from "../registry";
import { PAGES, setSeo } from "../../seo";
import { AvatarFace } from "../../Avatar";
import ShareButton from "../share/ShareButton";
import { acceptChallenge, deleteChallenge, getChallenge, type Challenge } from "./api";

/** start.ng/c/<code>: "Loki scored 4,200 on Relic Hunter. Can you beat it?" A signed-in friend who opens it takes the
 *  challenge (runs they play from then on count); someone signed out is asked to sign in first. */
export default function ChallengePage({ user, onSignIn, params }: PageProps) {
  const code = params.code;
  const [c, setC] = useState<Challenge | null | undefined>(undefined); // null: ended, or no such link
  const [error, setError] = useState("");

  useEffect(() => { setSeo(PAGES.challenge); }, []);

  // Load it, and take it as soon as a signed-in friend is looking (taking twice changes nothing).
  useEffect(() => {
    let live = true;
    setError("");
    getChallenge(code)
      .then((first) => (user && !first.mine && !first.attempt ? acceptChallenge(code).catch(() => first) : first))
      .then((got) => live && setC(got))
      .catch((e) => live && (e instanceof Error && /ended|exist/.test(e.message) ? setC(null) : setError("Couldn't load this challenge. Try again in a moment.")));
    return () => { live = false; };
  }, [code, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // While they play, show their progress when they come back to the tab.
  const mine = c?.mine;
  useEffect(() => {
    if (!user || mine !== false) return;
    const refresh = () => { if (document.visibilityState === "visible") getChallenge(code).then(setC).catch(() => {}); };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [code, user, mine]);

  async function remove() {
    if (!window.confirm("Delete this challenge? The link stops working.")) return;
    try { await deleteChallenge(code); setC(null); } catch (e) { setError(e instanceof Error ? e.message : "Couldn't delete it"); }
  }

  if (c === undefined && !error) return <section className="container challenge-page"><p className="board-sub">Loading...</p></section>;
  if (c === null) {
    return (
      <section className="container challenge-page">
        <h1>This challenge has ended</h1>
        <p className="lead-sm">Challenges last 30 days, or the person who made it took it down.</p>
        <p><a className="btn" href="/games">Play something else</a></p>
      </section>
    );
  }
  if (!c) return <section className="container challenge-page"><p className="error" role="alert">{error}</p></section>;

  const a = c.attempt;
  return (
    <section className="container challenge-page">
      <div className="challenge-card">
        {c.cover_url && <img className="challenge-cover" src={c.cover_url} alt={`${c.game_title} cover`} />}
        <div className="challenge-who">
          {c.character?.style && <AvatarFace style={c.character.style} size={64} />}
          <div>
            <h1>{c.challenger} scored {c.stat.shown} on {c.game_title}</h1>
            <p className="lead-sm">{c.mine ? "This is your challenge. Send the link to a friend." : "Can you beat it?"} ({c.stat.label})</p>
          </div>
        </div>

        {a?.beaten && <p className="ok" role="status">You beat it! Your best: {a.best}.</p>}
        {a && !a.beaten && a.best && <p className="note" role="status">Your best: {a.best}. {a.short_by} short. Go again!</p>}
        {a && !a.beaten && !a.best && <p className="note" role="status">You're in. Play {c.game_title} and your score counts.</p>}
        {!user && !c.mine && <p className="note">Sign in so your score counts.</p>}

        <div className="challenge-actions">
          {!user && !c.mine ? (
            <button type="button" onClick={onSignIn}>Sign in to take it</button>
          ) : (
            <a className="btn" href={`/games/${c.game}`}>{c.mine ? "Open the game" : a?.best ? "Play again" : "Play"}</a>
          )}
          {c.mine && <ShareButton kind="challenge" id={c.code} label="Share the challenge" />}
          {c.mine && <button type="button" className="link remove" onClick={remove}>Delete</button>}
        </div>
        {c.mine && <p className="note">{c.takers} {c.takers === 1 ? "friend has" : "friends have"} taken it, {c.beaten_by} beat it. It ends {new Date(c.expires_at).toLocaleDateString()}.</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
