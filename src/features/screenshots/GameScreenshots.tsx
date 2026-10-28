import { useEffect, useState } from "react";
import type { PagePartProps } from "../registry";
import { getScreenshots, type Screenshot } from "./api";

type Loaded = { game: string; shots: Screenshot[] };

/** The game page part (registerPagePart, page "game"): the pictures its startng.json lists, in a row that swipes
 * sideways on phones; each opens full size. Nothing shows when it lists none. The server writes the same words and
 * pictures on the game's page for search engines (startng-be app/features/screenshots/server_page.py). */
export default function GameScreenshots({ game }: PagePartProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null); // tied to the game it was fetched for
  useEffect(() => {
    if (!game) return;
    let live = true;
    getScreenshots(game)
      .then((shots) => live && setLoaded({ game, shots }))
      .catch(() => live && setLoaded({ game, shots: [] })); // pictures are extra: a failed load just leaves them out
    return () => { live = false; };
  }, [game]);
  const shots = loaded && loaded.game === game ? loaded.shots : [];
  if (!game || shots.length === 0) return null;
  return (
    <section className="game-page-share game-shots" aria-label="Screenshots">
      <span>Screenshots</span>
      <ul>
        {shots.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer"><img src={s.url} alt={s.alt} loading="lazy" decoding="async" /></a>
          </li>
        ))}
      </ul>
    </section>
  );
}
