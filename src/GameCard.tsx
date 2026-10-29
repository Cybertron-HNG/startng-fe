import type { ReactNode } from "react";
import type { User } from "./api";
import { cardPartsFor, type CardSlot } from "./features/registry";
import { useFeatures } from "./features/flags";
import type { Game } from "./games";

// A game's card on the homepage and /games. Features add to it through slots (src/features/registry.ts,
// registerCardPart) instead of editing this file: badges on the picture, stats under the title, actions by Play.
export default function GameCard({ game: g, legendary = false, link, user, onSignIn, favorite, board, play }: {
  game: Game;
  legendary?: boolean;
  link: { href: string; onClick?: (e: React.MouseEvent) => void };
  user: User | null;
  onSignIn: () => void;
  favorite: ReactNode;
  board: ReactNode;
  play: ReactNode;
}) {
  const isOn = useFeatures();
  const slot = (name: CardSlot) => {
    const parts = cardPartsFor(name)
      .filter((p) => isOn(p.feature))
      .map((p) => ({ key: p.key, node: p.render(g, { user, onSignIn }) }))
      .filter((p) => p.node !== null && p.node !== undefined && p.node !== false);
    return parts.length ? <div className={`card-${name}`}>{parts.map((p) => <span key={p.key}>{p.node}</span>)}</div> : null;
  };
  return (
    <article className={legendary ? "game legendary" : "game"}>
      <a className="game-link" {...link}>
        <div className="art" style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }}>
          {g.cover ? (
            <img src={g.cover} alt="" loading="lazy" decoding="async" />
          ) : (
            <div className="generated-tile">
              <span className="tile-initial">{g.title.charAt(0)}</span>
              <div className="tile-details">
                <span className="tile-title">{g.title}</span>
                <span className="tile-by">by {g.by}</span>
              </div>
            </div>
          )}
          {slot("badges")}
        </div>
        <div className="info">
          <h3>{g.title}</h3>
          <p>{g.host}</p>
          <span className="by">by {g.by}</span>
          {slot("stats")}
        </div>
      </a>
      <div className="meta">
        {favorite}
        {board}
        {slot("actions")}
        {play}
      </div>
    </article>
  );
}
