import { useEffect, useState } from "react";
import type { Game } from "../../games";
import type { PagePartProps } from "../registry";
import { displayName, followingGames, gameCreator, signedIn, type GameCreator } from "./api";
import FollowButton from "./FollowButton";

// Ziki #42: follow the creator of a game you like, and see their new games. Notifications are the email topic
// "When a creator you follow publishes a game" (features/email), so nothing more is sent from here.

/** On a game's page, next to Share it: who made it, and a Follow button. Not on your own game. */
export function GameCreatorFollow({ game, user, onSignIn }: PagePartProps) {
  const [info, setInfo] = useState<GameCreator | null>(null);
  useEffect(() => {
    if (!game) return;
    let live = true;
    gameCreator(game).then((got) => live && setInfo(got)).catch(() => live && setInfo(null));
    return () => { live = false; };
  }, [game, user?.id]);
  if (!info || info.creator.id === user?.id) return null;
  const name = displayName(info.creator);
  return (
    <div className="game-page-share creator-follow">
      <span>Made by</span>
      <a className="ghost btn" href={`/by/${info.creator.id}`}>{name}</a>
      <FollowButton userId={info.creator.id} name={name} onSignIn={onSignIn} showCount />
    </div>
  );
}

const ROW = 5; // one row of the same cards as the homepage shelves (features/discovery)

/** On the homepage, for players who follow someone: those creators' newest games. */
export function FollowingGames({ games, user }: PagePartProps) {
  const [row, setRow] = useState<{ following: number; names: string[] } | null>(null);
  useEffect(() => {
    if (!user || !signedIn()) { setRow(null); return; }
    let live = true;
    followingGames().then((got) => live && setRow({ following: got.following, names: got.games.map((g) => g.name) })).catch(() => {});
    return () => { live = false; };
  }, [user?.id]);
  if (!row || row.following === 0 || !games) return null;
  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const shown = row.names.map((n) => bySlug.get(n)).filter((g): g is Game => !!g).slice(0, ROW);
  return (
    <section className="container shelves" aria-label="From creators you follow">
      <div className="shelf">
        <h2>From creators you follow <a className="note" href="/follows">Who you follow</a></h2>
        {shown.length === 0 ? <p className="note">No games from the creators you follow yet. Their new games will show here.</p> : (
          <ul>
            {shown.map((g) => (
              <li key={g.slug} className="game">
                <a className="game-link" href={`/games/${g.slug}`}>
                  <div className="art" style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }}>
                    {g.cover ? <img src={g.cover} alt="" loading="lazy" decoding="async" /> : <span>{g.title.charAt(0)}</span>}
                  </div>
                  <div className="info">
                    <h3>{g.title}</h3>
                    <p>by {g.by}</p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
