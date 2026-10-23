import { useEffect, useState } from "react";
import { colorsFor } from "../../games";
import { getTags, type Tag, type TagsData } from "./api";

// The category cards: a colour from the same set as the game covers, the name and how many games.
export function TagTile({ tag }: { tag: Tag }) {
  const [a, b] = colorsFor(tag.slug);
  return (
    <a className="tag-tile" href={`/categories/${tag.slug}`} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
      <b>{tag.label}</b>
      <span>{tag.games} {tag.games === 1 ? "game" : "games"}</span>
    </a>
  );
}

/** The tags that have a page, from /tags. null until they arrive (or if the request fails: the section just isn't shown). */
export function useTags(): TagsData | null {
  const [data, setData] = useState<TagsData | null>(null);
  useEffect(() => {
    let live = true;
    getTags().then((d) => live && setData(d)).catch(() => {});
    return () => { live = false; };
  }, []);
  return data;
}

// The few shown on the homepage and /games: the friendly, popular ones first. The rest are on /categories.
const PICKS = ["endless-runners", "nigerian-themed", "brainy-games", "space-and-sci-fi", "racing-and-driving", "catch-and-dodge", "ancient-ruins-and-treasure", "with-friends"];
const MIN_SHOWN = 4; // fewer than this is not worth a section

export function Picks({ heading }: { heading: string }) {
  const data = useTags();
  if (!data) return null;
  const all = data.groups.flatMap((g) => g.tags);
  const picks = PICKS.map((s) => all.find((t) => t.slug === s)).filter((t): t is Tag => !!t);
  if (picks.length < MIN_SHOWN) return null;
  return (
    <section className="container tags-picks" aria-label={heading}>
      <div className="tags-picks-head">
        <h2>{heading}</h2>
        <a className="link" href="/categories">All categories →</a>
      </div>
      <div className="tag-tiles">{picks.map((t) => <TagTile key={t.slug} tag={t} />)}</div>
    </section>
  );
}
