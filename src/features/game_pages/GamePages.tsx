import { useEffect, useState } from "react";
import type { PagePartProps } from "../registry";
import { getSubPages, type SubPage } from "./api";

/** The game page part (registerPagePart, page "game"): links to this game's own pages (about, how to play, FAQ, walkthrough). */
export default function GamePages({ game }: PagePartProps) {
  const [pages, setPages] = useState<SubPage[]>([]);
  useEffect(() => {
    if (!game) return;
    let live = true;
    getSubPages(game).then((p) => live && setPages(p)).catch(() => {});
    return () => { live = false; };
  }, [game]);
  if (pages.length === 0) return null;
  return (
    <section className="container game-tags" aria-label="More about this game">
      <p className="eyebrow">More about this game</p>
      <ul>{pages.map((p) => <li key={p.kind}><a href={p.path}>{p.label}</a></li>)}</ul>
    </section>
  );
}
