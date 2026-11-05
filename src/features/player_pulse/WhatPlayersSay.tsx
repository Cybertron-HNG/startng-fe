import { useEffect, useState } from "react";
import type { YourGameProps } from "../registry";
import { getPulse, type Feel, type Pulse } from "./api";
import "./player_pulse.css";

// "What players say", inside Your games: how this week's players said a round felt. Only the creator sees it, and
// players are never named.
const FEEL: Record<Feel, string> = { loved: "😄 Loved it", too_hard: "😤 Too hard", too_easy: "😴 Too easy" };

export default function WhatPlayersSay({ game }: YourGameProps) {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  useEffect(() => {
    let live = true;
    getPulse(game.name).then((p) => live && setPulse(p)).catch(() => {});
    return () => { live = false; };
  }, [game.name]);
  if (!pulse) return null;
  return (
    <details className="player-pulse">
      <summary>
        <b>What players say</b>
        <span className="note">
          {pulse.answers === 0 ? "No answers yet this week" : `This week: ${pulse.loved_pct}% loved it · ${pulse.too_hard} said too hard · ${pulse.too_easy} said too easy`}
        </span>
      </summary>
      {pulse.answers === 0 ? (
        <p className="note">After a round, players can tap how it felt. Their answers from the last {pulse.days} days show here.</p>
      ) : (
        <>
          <dl>
            <div><dt>{FEEL.loved}</dt><dd>{pulse.loved}</dd></div>
            <div><dt>{FEEL.too_hard}</dt><dd>{pulse.too_hard}</dd></div>
            <div><dt>{FEEL.too_easy}</dt><dd>{pulse.too_easy}</dd></div>
          </dl>
          {pulse.notes.length > 0 && (
            <ul className="pulse-notes">
              {pulse.notes.map((n) => <li key={n.at}><span>{FEEL[n.feel]}</span> “{n.note}”</li>)}
            </ul>
          )}
        </>
      )}
    </details>
  );
}
