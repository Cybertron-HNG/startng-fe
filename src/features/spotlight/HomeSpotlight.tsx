import { useEffect, useState } from "react";
import type { PagePartProps } from "../registry";
import { getSpotlight, type Challenge, type Spotlight } from "./api";

/** The picture on a homepage banner: the game's cover, or its first letter. */
function Cover({ url, title }: { url: string | null; title: string }) {
  return (
    <span className="spot-cover" aria-hidden="true">
      {url ? <img src={url} alt="" loading="lazy" decoding="async" /> : <span>{title.charAt(0)}</span>}
    </span>
  );
}

export const left = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "resetting now";
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m left`;
};

/** On the homepage: the Game of the Week and today's daily challenge, as large banners like the tournament's. */
export function HomeSpotlight({ user }: PagePartProps) {
  const [s, setS] = useState<Spotlight | null>(null);
  useEffect(() => {
    let live = true;
    getSpotlight().then((got) => live && setS(got)).catch(() => {});
    return () => { live = false; };
  }, [user?.id]);
  if (!s || (!s.challenge && !s.game_of_the_week)) return null;
  const c = s.challenge, p = s.game_of_the_week;
  return (
    <>
      {p && (
        <section className="container" aria-label="Game of the Week">
          <a className="gotw" href={`/games/${p.game}`}>
            <span className="gotw-cover" aria-hidden="true">
              {p.cover_url ? <img src={p.cover_url} alt="" loading="lazy" decoding="async" /> : <span>{p.title.charAt(0)}</span>}
            </span>
            <div className="gotw-text">
              <span className="gotw-badge">★ Game of the Week</span>
              <h2>{p.title}</h2>
              <p>{p.note ?? "This week's pick from the start.ng team."}</p>
              <span className="gotw-cta">Play {p.title} →</span>
            </div>
          </a>
        </section>
      )}
      {c && (
        <section className="container" aria-label="Daily challenge">
          <a className="tournament-banner spot-banner" href={`/games/${c.game}`}>
            <div>
              <p className="eyebrow">Daily challenge · {left(c.ends_at)}</p>
              <h2>{goalLine(c)}</h2>
              <p className="tournament-banner-sub">
                {c.done ? "Done for today. Come back tomorrow for the next one." : c.best ? `Your best today: ${c.best}. One goal a day, set from how people play.` : "One goal a day, set from how people really play."}
              </p>
            </div>
            <Cover url={c.cover_url} title={c.game_title} />
            <span className="btn">{c.done ? "Play again →" : "Take the challenge →"}</span>
          </a>
        </section>
      )}
    </>
  );
}

/** Today's goal in one line, as the homepage banner and the game page say it. */
export const goalLine = (c: Challenge) =>
  c.goal_is_a_ceiling ? `Finish ${c.game_title} in ${c.goal_shown} or less` : `Reach ${c.goal_shown} in ${c.game_title}`;

/** On a game's page, when it is today's daily challenge (Ziki #25): the goal, the time left and whether this player has done
 *  it, so someone who tapped "Take the challenge" on the homepage sees what to aim for. */
export function GameChallenge({ game, user, onSignIn }: PagePartProps) {
  const [c, setC] = useState<Challenge | null>(null);
  useEffect(() => {
    let live = true;
    getSpotlight().then((got) => live && setC(got.challenge)).catch(() => {});
    return () => { live = false; };
  }, [user?.id]);
  if (!game || !c || c.game !== game) return null;
  return (
    <section className={c.done ? "game-challenge done" : "game-challenge"} aria-label="Today's daily challenge">
      <p className="eyebrow">Daily challenge · {left(c.ends_at)}</p>
      <h2>{goalLine(c)}</h2>
      <p className="game-challenge-sub">
        {c.done ? "Done for today ✓ Come back tomorrow for the next one."
          : c.best ? `Your best today: ${c.best}. One goal a day, set from how people play.`
          : user ? "Play and reach it before it resets. One goal a day, set from how people play."
          : "Sign in, then play and reach it before it resets."}
      </p>
      <div className="game-challenge-actions">
        {!user && <button type="button" className="ghost" onClick={onSignIn}>Sign in</button>}
        <a className="link" href="/spotlight">About daily challenges</a>
      </div>
    </section>
  );
}

/** On a game's page: a tag when it is this week's pick. */
export function WeekTag({ game }: PagePartProps) {
  const [pick, setPick] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    getSpotlight().then((got) => live && setPick(got.game_of_the_week?.game ?? null)).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!game || pick !== game) return null;
  return <a className="tag week-tag" href="/spotlight">Game of the Week</a>;
}
