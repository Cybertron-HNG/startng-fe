import { useEffect, useState } from "react";
import type { PagePartProps } from "../registry";
import { getNext } from "./api";
import { gameTitle as title } from "../../gameTitle";

type Suggestion = { name: string; title: string };


/** "Play next" on a game's page: one to three games to try after this one (inside a tournament, that tournament's games). */
export default function PlayNext({ game, user }: PagePartProps) {
  const [next, setNext] = useState<Suggestion[]>([]);
  const [tournament, setTournament] = useState<string | null>(null); // set when this game is in a tournament that is on now
  useEffect(() => {
    if (!game) return;
    let live = true;
    getNext(game)
      .then((r) => { if (live) { setNext(r.games.map((name) => ({ name, title: title(name) }))); setTournament(r.tournament ?? null); } })
      .catch(() => { if (live) { setNext([]); setTournament(null); } });
    return () => { live = false; };
  }, [game, user?.id]);
  if (next.length === 0) return null;
  return (
    <div className="game-page-share play-next">
      <span>{tournament ? `Play next in ${tournament}` : "Play next"}</span>
      {next.map((n) => <a key={n.name} className="ghost btn" href={`/games/${n.name}`}>{n.title}</a>)}
    </div>
  );
}
