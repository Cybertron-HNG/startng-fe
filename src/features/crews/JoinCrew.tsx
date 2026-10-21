import { useEffect, useState } from "react";
import type { PageProps } from "../registry";
import { PAGES, setSeo } from "../../seo";
import { getInvite, Invite, joinCrew } from "./api";

/** start.ng/join/<code>: a crew's invite link. Shows who invites you, then Join. */
export default function JoinCrew({ user, onSignIn, params }: PageProps) {
  const code = params.code;
  const [invite, setInvite] = useState<Invite | null | undefined>(undefined); // null: no such link
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setSeo(invite ? { ...PAGES.joinCrew, title: `Join ${invite.name} · start.ng` } : PAGES.joinCrew), [invite]);
  useEffect(() => {
    getInvite(code).then(setInvite).catch(() => setInvite(null));
  }, [code, user?.id]);

  async function join() {
    if (!user) return onSignIn();
    setBusy(true);
    setError("");
    try {
      location.assign(`/crews/${(await joinCrew(code)).id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join");
      setBusy(false);
    }
  }

  if (invite === undefined) return <section className="container tournament-page"><p className="board-sub">Loading…</p></section>;
  if (invite === null) {
    return (
      <section className="container tournament-page">
        <p className="empty">There's no crew at this link. It may have been replaced by a new one: ask whoever made the crew for their latest link. <a href="/crews">Make your own crew</a></p>
      </section>
    );
  }
  return (
    <section className="container tournament-page">
      <div className="friends-card">
        <div>
          <h2>{invite.owner} invited you to {invite.name}</h2>
          <p>{invite.kind[0].toUpperCase() + invite.kind.slice(1)} crew · {invite.members} {invite.members === 1 ? "person" : "people"} so far.</p>
          {error && <p className="error">{error}</p>}
        </div>
        {invite.joined ? (
          <a className="btn" href="/crews">You're in. Your crews</a>
        ) : invite.full ? (
          <span className="tag">This crew is full</span>
        ) : (
          <button type="button" disabled={busy} onClick={join}>{user ? (busy ? "Joining…" : "Join the crew") : "Sign in to join"}</button>
        )}
      </div>
    </section>
  );
}
