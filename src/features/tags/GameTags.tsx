import { useEffect, useState } from "react";
import type { PagePartProps } from "../registry";
import { getGameTags } from "./api";

/** The game page part (registerPagePart, page "game"): this game's categories, as links to their pages. */
export default function GameTags({ game }: PagePartProps) {
  const [tags, setTags] = useState<{ slug: string; label: string }[]>([]);
  useEffect(() => {
    if (!game) return;
    let live = true;
    getGameTags(game).then((t) => live && setTags(t)).catch(() => {});
    return () => { live = false; };
  }, [game]);
  if (tags.length === 0) return null;
  return (
    <section className="container game-tags" aria-label="Categories">
      <p className="eyebrow">Categories</p>
      <ul>{tags.map((t) => <li key={t.slug}><a href={`/categories/${t.slug}`}>{t.label}</a></li>)}</ul>
    </section>
  );
}
