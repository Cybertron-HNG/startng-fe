import { useState } from "react";
import { call } from "../../api";
import type { PagePartProps } from "../registry";

// "Surprise me" (Ziki #18): a random live game, for players who don't know where to start. Signed-in players get one
// they haven't opened lately (startng-be app/features/surprise).
const token = () => localStorage.getItem("token");

/** inPage: the slot is already inside the page's .container (/games), so don't pad it twice. */
export default function SurpriseMe({ inPage = false }: PagePartProps & { inPage?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = () => {
    setBusy(true);
    setError("");
    call<{ game: string }>(token(), "/discover/surprise")
      .then(({ game }) => location.assign(`/games/${encodeURIComponent(game)}`))
      .catch(() => { setBusy(false); setError("Couldn't pick a game. Try again."); });
  };
  return (
    <div className={inPage ? "surprise-me" : "container surprise-me"}>
      <button type="button" className="btn ghost" disabled={busy} onClick={go}>{busy ? "Picking…" : "🎲 Surprise me"}</button>
      <span className="note">{error || "Not sure what to play? Get a random game."}</span>
    </div>
  );
}
