import { useMajorMode } from "../../majorMode";
import type { PagePartProps } from "../registry";
import { ordinal } from "./api";
import { statusText } from "./when";
import "./majors.css";

/** On the home and tournament pages: the major that's on (or coming up), as a dark card with the partner's picture fading in
 *  on the right, the prizes as ticket stubs and the way in. While a major runs it takes the daily tournament banner's place
 *  (App.tsx hides that one). Shows nothing when there isn't one. */
export default function MajorBanner(_: PagePartProps) {
  const { next: major } = useMajorMode();
  if (!major) return null;
  const prizes = [...major.prizes].sort((a, b) => a.place - b.place).slice(0, 3);
  const sameForAll = prizes.length > 1 && prizes.every((p) => p.prize === prizes[0].prize);
  const live = major.state === "running";
  // What a screen reader hears for the whole card, instead of every word in it read in one breath.
  const label = `${major.title}: ${statusText(major)}. ${sameForAll ? `Top ${prizes.length} each win ${lower(prizes[0].prize)}.` : `Top ${prizes.length} win prizes.`} See the major.`;
  return (
    <section className="container" aria-label={major.title === major.partner.name ? major.title : `${major.title}, with ${major.partner.name}`}>
      <a className={major.image_url ? "major-card-home has-art" : "major-card-home"} href={`/majors/${major.slug}`} aria-label={label}>
        {major.image_url && <img className="major-art" src={major.image_url} alt="" decoding="async" fetchPriority="high" />}
        <div className="major-card-corner">
          <span className={live ? "major-when live" : "major-when"}>{live && <i aria-hidden="true" />}{statusText(major)}</span>
          <span className="major-with">
            <span className="major-with-word">with</span> {major.partner.logo_url && <img src={major.partner.logo_url} alt="" width={20} height={20} loading="lazy" />}<b>{major.partner.name}</b>
          </span>
        </div>
        <div className="major-card-text">
          <h2>{major.title}</h2>
          <p className="major-card-tagline">{withBoldDates(major.tagline)}</p>
          <ol className="major-tickets" aria-label={sameForAll ? `Prizes: places 1 to ${prizes.length} each win ${lower(prizes[0].prize)}` : "Prizes"}>
            {prizes.map((p) => (
              <li key={p.place} className={`major-ticket place-${p.place}`}>
                <span className="major-ticket-main">
                  <small aria-hidden="true">{sameForAll && /ticket/i.test(prizes[0].prize) ? "Admit one" : "Prize"}</small>
                  <b>{ordinal(p.place)}</b>
                  {!sameForAll && <span>{p.prize}</span>}
                </span>
                <span className="major-ticket-stub" aria-hidden="true">{String(p.place).padStart(2, "0")}</span>
              </li>
            ))}
          </ol>
          <div className="major-card-foot">
            <span className="btn">{major.state === "upcoming" ? "Enter now" : `Play for the top ${major.prizes.length}`}</span>
          </div>
        </div>
      </a>
    </section>
  );
}

/** A day and date in the tagline ("Saturday 5 December") is shown in bold, so the event day stands out. */
const DATE = /((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December))/;
const withBoldDates = (text: string) => text.split(DATE).map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part));

/** "A solo ticket to ..." reads as "a solo ticket to ..." after "Each wins". */
const lower = (s: string) => s.replace(/^(A|An|The) /, (w) => w.toLowerCase());
