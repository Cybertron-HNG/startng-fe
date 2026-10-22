import { useEffect, useState } from "react";
import type { YourGameProps } from "../registry";
import { getFeaturing, type Featuring } from "./api";

// In Your games: whether the game is featured, and the checklist of what it still needs (PRD A1).
export default function YourFeaturing({ game }: YourGameProps) {
  const [f, setF] = useState<Featuring | null>(null);

  useEffect(() => {
    let live = true;
    getFeaturing(game.name).then((d) => live && setF(d)).catch(() => {});
    return () => { live = false; };
  }, [game.name]);

  if (!f) return null;
  const headline = f.featured ? "Featured on the homepage." : f.staff_pick ? "A staff pick on the homepage." : f.eligible ? "Ready to be featured. The start.ng team chooses the featured games." : "To be featured:";
  return (
    <div className="featuring">
      <p className="note"><strong>{headline}</strong></p>
      <ul className="featuring-checks">
        {f.checks.map((c) => (
          <li key={c.key} className={c.ok ? "ok" : c.required ? "todo" : "nice"}>
            <span aria-hidden="true">{c.ok ? "✓" : c.required ? "✗" : "○"}</span> {c.label}
            {!c.required && !c.ok && <span className="note"> (nice to have)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
