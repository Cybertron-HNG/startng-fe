import { useEffect, useState } from "react";
import type { PagePartProps } from "../registry";
import { getTipBox, sendTip, type TipBoxInfo } from "./api";

const supportersText = (n: number) => `❤️ ${n} ${n === 1 ? "supporter" : "supporters"}`;

/** Tip the creator, on a game's page: 10, 25 or 50 of your earned coins, with an optional thank-you. */
export default function TipBox({ user, onSignIn, game }: PagePartProps) {
  const [info, setInfo] = useState<TipBoxInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(10);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  useEffect(() => {
    if (!game) return;
    let live = true;
    const load = () => getTipBox(game).then((got) => live && setInfo(got)).catch(() => {});
    load();
    // Playing happens in another tab: ask again when they come back, so "play first" turns into the button.
    const back = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", back);
    return () => { live = false; document.removeEventListener("visibilitychange", back); };
  }, [game, user?.id]);

  if (!game || !info) return null;

  async function tip() {
    setBusy(true);
    setError("");
    try {
      const r = await sendTip(game!, amount, note);
      setSent(`Sent ${amount} coins. Thank you for supporting this creator! You have ${r.balance} coins left.`);
      setOpen(false);
      setNote("");
      setInfo(await getTipBox(game!));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your tip");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="game-page-share tip-box">
      <span>Tip the creator</span>
      {info.supporters > 0 && <b className="tip-supporters">{supportersText(info.supporters)}</b>}
      {!user && <button type="button" className="ghost btn" onClick={onSignIn}>Sign in to tip</button>}
      {user && info.can_tip && !open && <button type="button" className="ghost btn" onClick={() => { setOpen(true); setSent(""); }}>Tip the creator</button>}
      {user && !info.can_tip && info.reason && <span className="note">{info.reason}</span>}
      {open && (
        <form className="tip-form" onSubmit={(e) => { e.preventDefault(); tip(); }}>
          <div className="segmented" role="group" aria-label="Coins to send">
            {info.amounts.map((a) => (
              <button key={a} type="button" className={amount === a ? "on" : ""} aria-pressed={amount === a}
                disabled={info.coins !== null && a > info.coins} onClick={() => setAmount(a)}>{a} coins</button>
            ))}
          </div>
          <label className="tip-note">
            A short thank-you (optional)
            <input value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="Loved the last level!" />
          </label>
          <div className="tip-actions">
            <button type="submit" disabled={busy}>{busy ? "Sending…" : `Send ${amount} coins`}</button>
            <button type="button" className="link" onClick={() => setOpen(false)}>Cancel</button>
          </div>
          <p className="note">You can tip coins you earned by playing: up to 3 tips and 100 coins a day.</p>
        </form>
      )}
      {sent && <p className="note" role="status">{sent}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
