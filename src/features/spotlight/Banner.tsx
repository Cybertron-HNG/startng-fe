import { useEffect, useState } from "react";
import type { PagePartProps } from "../registry";
import { getSpotlight, type Challenge, type Spotlight } from "./api";

// The homepage spotlight (PRD A2): this week's Game of the Week and today's daily challenge.
function timeLeft(endsAt: string, now: number) {
  const mins = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function ChallengeCard({ c, signedIn, onSignIn }: { c: Challenge; signedIn: boolean; onSignIn: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <article className="spot-card spot-challenge">
      <span className="tag">Daily challenge</span>
      <h3>{c.game_title}</h3>
      <p className="spot-goal"><strong>{c.goal_shown}</strong> <span>{c.stat} or {c.goal_is_a_ceiling ? "less" : "more"}</span></p>
      <p className="note">
        {c.done === true ? "Done today ✓" : c.done === false ? (c.best ? `Your best today: ${c.best}` : "Not done yet today") : null}
        {c.done === true || c.done === false ? " · " : ""}Resets in {timeLeft(c.ends_at, now)}
      </p>
      <div className="spot-actions">
        <a className="play" href={`/games/${c.game}`}>{c.done ? "Play again" : "Play"}</a>
        {!signedIn && <button type="button" className="link" onClick={onSignIn}>Sign in to take part</button>}
      </div>
    </article>
  );
}

export default function Banner({ user, onSignIn }: PagePartProps) {
  const [data, setData] = useState<Spotlight | null>(null);
  const signedIn = !!user;

  useEffect(() => {
    let live = true;
    getSpotlight().then((d) => live && setData(d)).catch(() => {});
    return () => { live = false; };
  }, [signedIn]);

  const pick = data?.game_of_the_week;
  const challenge = data?.challenge;
  if (!pick && !challenge) return null;
  return (
    <section className="container spotlight" aria-label="Spotlight">
      <div className="spot-grid">
        {pick && (
          <a className="spot-card spot-week" href={`/games/${pick.game}`}>
            <span className="tag">Game of the Week</span>
            {pick.cover_url && <img className="spot-cover" src={pick.cover_url} alt="" loading="lazy" decoding="async" />}
            <h3>{pick.title}</h3>
            {pick.note && <p className="note">{pick.note}</p>}
          </a>
        )}
        {challenge && <ChallengeCard c={challenge} signedIn={signedIn} onSignIn={onSignIn} />}
      </div>
    </section>
  );
}
