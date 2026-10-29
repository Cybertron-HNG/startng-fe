import { useEffect, useState } from "react";
import type { YourGameProps } from "../registry";
import { getReceived, type Received } from "./api";

/** In Your games: the tips this game got from players, with their notes. */
export default function YourTips({ game }: YourGameProps) {
  const [r, setR] = useState<Received | null>(null);
  useEffect(() => {
    let live = true;
    getReceived(game.name).then((got) => live && setR(got)).catch(() => {});
    return () => { live = false; };
  }, [game.name]);
  if (!r || r.count === 0) return null;
  return (
    <details className="your-tips">
      <summary>Tips: {r.coins} coins from {r.count} {r.count === 1 ? "tip" : "tips"}</summary>
      <ul>
        {r.tips.map((t, i) => (
          <li key={i}>
            <b>{t.by}</b> sent {t.amount} coins{t.note && <>: “{t.note}”</>}
            <span className="note"> · {new Date(t.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
          </li>
        ))}
      </ul>
      <p className="note">Tips are yours to spend in the shop like any coins.</p>
    </details>
  );
}
