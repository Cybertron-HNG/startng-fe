import type { Game } from "../../games";
import type { PagePartProps } from "../registry";
import { ago, useLive } from "./api";
import "./live.css";

/** "● 3 playing now" on a game card or a game's page (only from 2 players, so a game never looks empty). */
export function PlayingNow({ slug }: { slug: string }) {
  const n = useLive()?.playing[slug];
  return n ? <span className="playing-now"><i aria-hidden="true" />{n} playing now</span> : null;
}

export const CardPlaying = ({ game }: { game: Game }) => <PlayingNow slug={game.slug} />;

export function GamePlaying({ game }: PagePartProps) {
  return game ? <div className="container live-line"><PlayingNow slug={game} /></div> : null;
}

/** The homepage strip: who just took #1, and which games have people in them right now. Nothing when it's quiet. */
export function LiveStrip({ games }: PagePartProps) {
  const live = useLive();
  if (!live) return null;
  const title = (slug: string) => games?.find((g) => g.slug === slug)?.title ?? slug;
  const busy = Object.entries(live.playing).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!busy.length && !live.moments.length) return null;
  return (
    <section className="container live-strip" aria-label="Happening now">
      <h2><i aria-hidden="true" />Happening now</h2>
      <ul>
        {busy.map(([slug, n]) => (
          <li key={`p-${slug}`}><a href={`/games/${slug}`}>{n} people are playing <b>{title(slug)}</b></a></li>
        ))}
        {live.moments.map((m) => (
          <li key={`m-${m.game}-${m.at}`}><a href={`/games/${m.game}`}>{m.who} took #1 on <b>{m.title}</b></a> <span className="note">{ago(m.at)}</span></li>
        ))}
      </ul>
    </section>
  );
}

/** On /tournament: how many are on today's tournament games right now. */
export function TournamentPlaying(_: PagePartProps) {
  const n = useLive()?.tournament_playing;
  return n ? <p className="container live-line"><span className="playing-now"><i aria-hidden="true" />{n} players are on tournament games right now</span></p> : null;
}
