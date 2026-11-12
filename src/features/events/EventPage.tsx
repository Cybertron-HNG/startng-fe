import { useEffect, useState } from "react";
import { call } from "../../api";
import { PAGES, setSeo } from "../../seo";
import type { SpotlightEvent } from "../../eventMode";
import type { PageProps } from "../registry";
import { ArrowIcon, CalendarIcon, PinIcon } from "./EventIcons";
import { countdown, imageUrl, timeLine, whereLine } from "./format";
import "./events.css";

/** start.ng/event/<slug>: the whole event. Pictures, what it is, when, where, what's on, who is behind it, and where to get in.
 *  Anyone with the address can open it, spotlighted or not (a finished event keeps its page, with a note). */
export default function EventPage({ params }: PageProps) {
  const slug = params.slug;
  const [event, setEvent] = useState<SpotlightEvent | null | undefined>(undefined); // null: no such event
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setEvent(undefined); setError("");
    call<SpotlightEvent>(null, `/events/${slug}`)
      .then((got) => {
        if (!live) return;
        setEvent(got);
        setSeo({ title: `${got.title} · start.ng`, description: (got.tagline ? `${got.tagline}. ` : "") + got.description.slice(0, 220), path: `/event/${slug}` });
      })
      .catch((e) => {
        if (!live) return;
        if (e instanceof Error && /No event/.test(e.message)) {
          setEvent(null);
          setSeo({ ...PAGES.notFound, title: "No event here · start.ng", description: "There is no event at this address.", path: `/event/${slug}` });
        } else setError("Couldn't load this event. Try again in a moment.");
      });
    return () => { live = false; };
  }, [slug]);

  if (error) return <section className="container evt-page"><p className="error" role="alert">{error}</p></section>;
  if (event === undefined) return <section className="container evt-page"><p className="board-sub" role="status">Loading…</p></section>;
  if (event === null) {
    return (
      <section className="container evt-page">
        <h1>No event here</h1>
        <p>There is no event at this address.</p>
        <p><a className="btn" href="/">Back to the homepage</a></p>
      </section>
    );
  }

  const [cover, ...more] = event.images;
  const paragraphs = event.description.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <article className="container evt-page">
      <header className="evt-page-head">
        <h1>{event.title}</h1>
        {event.tagline && <p className="evt-page-tag">{event.tagline}</p>}
        {event.phase === "past" && <p className="evt-ended" role="status">This event has ended.</p>}
      </header>

      {cover && <img className="evt-cover" src={imageUrl(cover.path)} alt={cover.alt ?? ""} decoding="async" fetchPriority="high" />}

      <div className="evt-facts">
        <div>
          <CalendarIcon />
          <h2>When</h2>
          <p>{timeLine(event, true)}</p>
          {event.phase !== "past" && <p className="evt-count">{countdown(event)}</p>}
        </div>
        <div>
          <PinIcon />
          <h2>Where</h2>
          <p>{event.venue}</p>
          {event.address && <p className="evt-sub">{event.address}</p>}
        </div>
        {(event.ticket_url || event.website_url) && event.phase !== "past" && (
          <div className="evt-facts-cta">
            {event.ticket_url && <a className="btn" href={event.ticket_url} target="_blank" rel="noreferrer noopener">{event.ticket_label} <ArrowIcon /></a>}
            {event.website_url && <a className="evt-link" href={event.website_url} target="_blank" rel="noreferrer noopener">Event website</a>}
          </div>
        )}
      </div>

      <section className="evt-about" aria-labelledby="evt-about-h">
        <h2 id="evt-about-h">About the event</h2>
        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </section>

      {event.highlights.length > 0 && (
        <section aria-labelledby="evt-on-h">
          <h2 id="evt-on-h">What's on</h2>
          <dl className="evt-on">
            {event.highlights.map((h) => (
              <div key={h.title}><dt>{h.title}</dt>{h.text && <dd>{h.text}</dd>}</div>
            ))}
          </dl>
        </section>
      )}

      {more.length > 0 && (
        <section aria-label="Pictures from the event">
          <ul className="evt-gallery">
            {more.map((img) => <li key={img.id}><img src={imageUrl(img.path)} alt={img.alt ?? ""} loading="lazy" decoding="async" /></li>)}
          </ul>
        </section>
      )}

      {event.partners.length > 0 && (
        <section aria-labelledby="evt-with-h">
          <h2 id="evt-with-h">With</h2>
          <ul className="evt-partners">
            {event.partners.map((p) => (
              <li key={p.name}>{p.url ? <a href={p.url} target="_blank" rel="noreferrer noopener">{p.name}</a> : p.name}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
