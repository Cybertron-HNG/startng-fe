import { useEventMode } from "../../eventMode";
import type { PagePartProps } from "../registry";
import { ArrowIcon, CalendarIcon, PinIcon } from "./EventIcons";
import { countdown, dateBlock, imageUrl, timeLine, whereLine } from "./format";

/** The homepage part (registerPagePart, page "home"): the spotlighted event, full width, where the tournament banner usually
 *  is. The picture fills the card; the date sits on it as a block; one big link to the event page and, if it has them, a
 *  ticket link beside it. While it is showing, the other promotions step aside (eventMode.ts). */
export function EventHero(_: PagePartProps) {
  const { event: e } = useEventMode();
  if (!e) return null;
  const cover = e.images[0];
  const { day, month } = dateBlock(e.starts_at);
  return (
    <section className="container" aria-label={`Event: ${e.title}`}>
      <article className="evt-hero">
        {cover && <img className="evt-hero-img" src={imageUrl(cover.path)} alt={cover.alt ?? ""} decoding="async" fetchPriority="high" />}
        <div className="evt-hero-body">
          <div className="evt-date" aria-hidden="true"><b>{day}</b><span>{month}</span></div>
          <h2>{e.title}</h2>
          {e.tagline && <p className="evt-hero-tag">{e.tagline}</p>}
          <ul className="evt-meta">
            <li><CalendarIcon /><span>{timeLine(e)}<em>{countdown(e)}</em></span></li>
            <li><PinIcon /><span>{whereLine(e)}</span></li>
          </ul>
          <div className="evt-actions">
            <a className="evt-go" href={`/event/${e.slug}`}>See the event <ArrowIcon /></a>
            {e.ticket_url && <a className="evt-ticket" href={e.ticket_url} target="_blank" rel="noreferrer noopener">{e.ticket_label}</a>}
          </div>
        </div>
      </article>
    </section>
  );
}
