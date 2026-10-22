import { useState } from "react";
import type { PagePartProps } from "../registry";
import ShareButton from "../share/ShareButton";
import { makeChallenge } from "./api";

/** "Challenge a friend" on a game's page: turns the player's best run into a link and offers to share it. */
export default function ChallengeButton({ user, onSignIn, game }: PagePartProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!game) return null;

  async function make() {
    if (!user) return onSignIn();
    setBusy(true);
    setError("");
    try { setCode((await makeChallenge(game!)).code); } catch (e) { setError(e instanceof Error ? e.message : "Couldn't make a challenge"); } finally { setBusy(false); }
  }

  return (
    <div className="game-page-share challenge-make">
      <span>Challenge a friend</span>
      {code ? (
        <>
          <ShareButton kind="challenge" id={code} />
          <a className="ghost btn" href={`/c/${code}`}>See the link</a>
        </>
      ) : (
        <button type="button" className="ghost" disabled={busy} onClick={make}>{busy ? "..." : "Beat my best score"}</button>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
