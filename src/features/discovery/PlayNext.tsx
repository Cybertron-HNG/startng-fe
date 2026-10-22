import { useEffect, useState } from "react";
import { listGames } from "../../api";
import { toCard, type Game } from "../../games";
import type { PagePartProps } from "../registry";
import { getPlayNext } from "./api";

// "Play next" on a game's page (PRD A1, C10): one to three suggestions from GET /discover/next.
export default function PlayNext({ game }: PagePartProps) {
  const [cards, setCards] = useState<Game[] | null>(null);

  useEffect(() => {
    if (!game) return;
    let live = true;
    Promise.all([getPlayNext(game), listGames()])
      .then(([next, all]) => {
        const byName = new Map(all.map((g) => [g.name, g]));
        const found = next.games.map((n) => byName.get(n)).filter((g): g is NonNullable<typeof g> => !!g).map(toCard);
        if (live) setCards(found);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [game]);

  if (!cards || cards.length === 0) return null;
  return (
    <section className="play-next" aria-label="Play next">
      <h2>Play next</h2>
      <div className="play-next-list">
        {cards.map((g) => (
          <a key={g.slug} className="play-next-card" href={`/games/${g.slug}`}>
            <span className="play-next-art" style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }}>
              {g.cover ? <img src={g.cover} alt="" loading="lazy" decoding="async" /> : <span>{g.title.charAt(0)}</span>}
            </span>
            <span className="play-next-title">{g.title}</span>
            <span className="note">by {g.by}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
