import { useEffect, useState } from "react";
import GameCard from "../../GameCard";
import type { Game } from "../../games";
import type { PagePartProps } from "../registry";
import { getShelves, type Shelves as ShelvesData } from "./api";

// The homepage shelves (PRD A1). Each shelf is a row of the same GameCard the rest of the site uses. A shelf with no
// games isn't shown, so a new site with few games doesn't get empty headings.
const SHELVES: { key: keyof ShelvesData; title: string }[] = [
  { key: "continue_playing", title: "Continue playing" },
  { key: "featured", title: "Featured" },
  { key: "staff", title: "Staff picks" },
  { key: "new", title: "New this week" },
  { key: "most_played", title: "Most played" },
  { key: "most_improved", title: "Most improved" },
];
const PER_SHELF = 4;

export default function Shelves({ user, onSignIn, games }: PagePartProps) {
  const [data, setData] = useState<ShelvesData | null>(null);
  const signedIn = !!user;

  useEffect(() => {
    let live = true;
    getShelves().then((d) => live && setData(d)).catch(() => {});
    return () => { live = false; };
  }, [signedIn]);

  if (!data || !games) return null;
  const bySlug = new Map(games.map((g) => [g.slug, g]));

  return (
    <>
      {SHELVES.map(({ key, title }) => {
        const list = data[key].map((name) => bySlug.get(name)).filter((g): g is Game => !!g).slice(0, PER_SHELF);
        if (list.length === 0) return null;
        return (
          <section key={key} className="container shelf" aria-label={title}>
            <div className="section-head"><h2>{title}</h2></div>
            <div className="grid">
              {list.map((g) => (
                <GameCard key={g.slug} game={g} link={{ href: `/games/${g.slug}` }} user={user} onSignIn={onSignIn} favorite={null} board={null}
                  play={<a className="play" href={`/games/${g.slug}`}>View</a>} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
