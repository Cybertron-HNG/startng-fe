import type { ReactNode } from "react"; 
import type { User } from "./api"; 
import { cardPartsFor, type CardSlot } from "./features/registry"; 
import { useFeatures } from "./features/flags"; 
import type { Game } from "./games"; 
 
export default function GameCard({ game: g, legendary = false, link, user, onSignIn, favorite, board, play }: { 
  game: Game; 
  legendary?: boolean; 
  link: { href: string; onClick?: (e: React.MouseEvent) = }; 
  onSignIn: () =
  favorite: ReactNode; 
  board: ReactNode; 
  play: ReactNode; 
}) { 
  const isOn = useFeatures(); 
  const slot = (name: CardSlot) =
    const parts = cardPartsFor(name) 
      .filter((p) =
      .map((p) = key: p.key, node: p.render(g, { user, onSignIn }) })) 
      .filter((p) = !== null && p.node !== undefined && p.node !== false); 
    return parts.length ? <div className={`card-${name}`}>{parts.map((p) = key={p.key}>{p.node}</span : null; 
  }; 
  return ( 
    <article className={legendary ? "game legendary" : "game"}> 
      <a className="game-link" {...link}> 
        <div className="art" style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }}> 
          {g.cover ? <img src={g.cover} alt="" loading="lazy" decoding="async" /> : <span>{g.title.charAt(0)}</span
          {slot("badges")} 
        </div> 
        <div className="info"> 
          <h3>{g.title}</h3> 
          <p>{g.host}</p> 
          <span className="by"> 
            by {g.by} 
            {(g as any).is_verified && ( 
              <span title="Verified Creator" style={{ marginLeft: '6px', color: '#3b82f6', fontSize: '0.9em' }}> 
                ?? 
              </span> 
            )} 
          </span> 
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
