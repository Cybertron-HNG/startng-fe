import { useEffect, useState } from "react";
import type { PageProps } from "../registry";
import { setSeo } from "../../seo";
import { listMajors, ordinal, type Summary } from "./api";
import { dayTime, statusText } from "./when";
import "./majors.css";

/** start.ng/majors: every major, the one that's on first. */
export default function MajorsList(_: PageProps) {
  const [majors, setMajors] = useState<Summary[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setSeo({ title: "Majors · tournaments with prizes · start.ng", description: "Majors are start.ng's big tournaments, run with partners, with real prizes for the top players.", path: "/majors" });
    listMajors().then(setMajors).catch(() => setError("Couldn't load the majors. Try again in a moment."));
  }, []);
  return (
    <section className="container tournament-page major-page">
      <div>
        <p className="eyebrow">Majors</p>
        <h1>Big tournaments. <mark>Real prizes.</mark></h1>
        <p className="tournament-sub">A major runs for days, with a partner, and the top players win what's on the table. <a href="/tournament">Today's tournament →</a></p>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!majors && !error && <p className="board-sub" role="status">Loading…</p>}
      {majors && majors.length === 0 && <p className="empty">No major right now. <a href="/tournament">Play today's tournament</a></p>}
      <div className="major-list">
        {majors?.map((m) => (
          <a key={m.slug} className="major-card" href={`/majors/${m.slug}`}>
            <span className={`tag ${m.state === "ended" ? "done" : ""}`}>{statusText(m)}</span>
            <h2>{m.title}</h2>
            <p className="major-with">With {m.partner.name} · {m.games.length} {m.games.length === 1 ? "game" : "games"} · {m.entrants} {m.entrants === 1 ? "player" : "players"}</p>
            <p>{m.tagline}</p>
            <p className="note">{dayTime(m.starts_at)} to {dayTime(m.ends_at)} · {ordinal(1)} prize: {m.prizes[0]?.prize}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
