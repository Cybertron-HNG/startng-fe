import { useEffect, useState } from "react";
import type { PagePartProps } from "../registry";
import { listMajors, ordinal, type Summary } from "./api";
import { statusText } from "./when";
import "./majors.css";

/** On the home and tournament pages: the major that's on (or coming up), with the partner, the prize and a way in.
 *  Shows nothing when there isn't one. */
export default function MajorBanner(_: PagePartProps) {
  const [major, setMajor] = useState<Summary | null>(null);
  useEffect(() => {
    listMajors().then((all) => setMajor(all.find((m) => m.state !== "ended") ?? null)).catch(() => setMajor(null));
  }, []);
  if (!major) return null;
  const top = major.prizes.length;
  return (
    <section className="container">
      <a className="tournament-banner major-banner" href={`/majors/${major.slug}`}>
        <div>
          <p className="eyebrow">Major · with {major.partner.name} · {statusText(major)}</p>
          <h2>{major.title}</h2>
          <p className="tournament-banner-sub">{major.tagline}</p>
        </div>
        <ol className="major-banner-prizes" aria-label="Prizes">
          {major.prizes.slice(0, 3).map((p) => <li key={p.place}><b>{ordinal(p.place)}</b><span>{p.prize}</span></li>)}
        </ol>
        <span className="btn">{major.state === "upcoming" ? "Enter early" : `Play for the top ${top}`}</span>
      </a>
    </section>
  );
}
