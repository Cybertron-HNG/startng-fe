import { Fragment, useEffect, useState } from "react";
import type { PagePartProps } from "../registry";
import { getRemix, type Remix } from "./api";

const times = (n: number) => (n === 1 ? "once" : `${n} times`);

/** The game page part (registerPagePart, page "game"): "Remixed from", "Remixed N times" and the Remix it button. The
 *  server writes the same lines for search engines (startng-be app/features/remix/server_pages.py): keep the words,
 *  links and class names the same in both. */
export default function GameRemix({ game }: PagePartProps) {
  const [loaded, setLoaded] = useState<{ game: string; remix: Remix } | null>(null);
  useEffect(() => {
    if (!game) return;
    let live = true;
    setLoaded(null);
    getRemix(game).then((remix) => live && setLoaded({ game, remix })).catch(() => {});
    return () => { live = false; };
  }, [game]);
  const r = loaded && loaded.game === game ? loaded.remix : null;
  if (!r || (!r.remix_of && !r.count && !r.fork_url)) return null;
  const more = r.count - r.remixes.length;
  return (
    <section className="game-remix" aria-label="Remix">
      <span>Remix</span>
      {r.remix_of && (
        <p>Remixed from <a href={`/games/${r.remix_of.name}`}>{r.remix_of.title}</a> by {r.remix_of.by}</p>
      )}
      {r.count > 0 && (
        <p>
          Remixed {times(r.count)}:{" "}
          {r.remixes.map((g, i) => <Fragment key={g.name}>{i > 0 && ", "}<a href={`/games/${g.name}`}>{g.title}</a></Fragment>)}
          {more > 0 && ` and ${more} more`}
        </p>
      )}
      {r.fork_url && (
        <p>
          <a className="ghost btn" href={r.fork_url} rel="noopener">Remix it</a>{" "}
          Make your own version: fork it on GitHub, change the name, make it yours, then publish it on start.ng.
        </p>
      )}
    </section>
  );
}
