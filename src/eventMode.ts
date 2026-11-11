// Event mode (the events feature, startng-be app/features/events). While an admin has an event spotlighted, the top of the
// homepage belongs to it: the tournament banner and the promotional boxes step aside, and only the parts listed in
// EVENT_HOME_KEEPS (plus the games lists the homepage itself draws) stay. It lives here, in core, because the homepage
// and PageParts both need the answer before they draw anything, so nothing appears and then disappears.
import { useEffect, useState } from "react";
import { call } from "./api";
import { loadFeatures } from "./features/flags";

export type EventImage = { id: number; path: string; alt: string | null };
export type EventHighlight = { title: string; text: string };
export type EventPartner = { name: string; url: string | null };
export type SpotlightEvent = {
  id: number; slug: string; title: string; tagline: string | null; description: string; starts_at: string; ends_at: string | null;
  venue: string; address: string | null; ticket_url: string | null; ticket_label: string; website_url: string | null;
  highlights: EventHighlight[]; partners: EventPartner[]; images: EventImage[]; spotlight: boolean; phase: "upcoming" | "now" | "past";
};

/** The homepage parts (registerPagePart keys) that stay while an event is spotlighted. Everything else on the homepage's
 *  part list (Game of the Week, the daily challenge, the shelves, categories) steps aside. One line to change. */
export const EVENT_HOME_KEEPS: readonly string[] = ["event-hero"];

export type EventMode = { ready: boolean; event: SpotlightEvent | null };

let mode: EventMode = { ready: false, event: null };
let started = false;
const listeners = new Set<(m: EventMode) => void>();

function publish(next: EventMode) {
  mode = next;
  listeners.forEach((tell) => tell(next));
}

function start() {
  if (started) return;
  started = true;
  loadFeatures()
    .then((flags) => (flags.has("*") || flags.has("events") ? call<SpotlightEvent | null>(null, "/events/spotlight") : null))
    .catch(() => null) // if the API can't answer, show the normal homepage
    .then((event) => publish({ ready: true, event }));
}

/** Whether an event is spotlighted. ready is false until the answer is in (flags first, then the event), so callers hold back. */
export function useEventMode(): EventMode {
  const [m, setM] = useState(mode);
  useEffect(() => {
    listeners.add(setM);
    setM(mode);
    start();
    return () => { listeners.delete(setM); };
  }, []);
  return m;
}
