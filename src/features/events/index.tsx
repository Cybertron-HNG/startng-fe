// Event spotlight (Tolu). The flag is "events" (startng-be app/features/events). An admin adds an event with pictures and details
// and spotlights it: the hero takes the top of the homepage, the other promotions step aside (src/eventMode.ts), and the event
// gets its own page at /event/<slug>. Only one event is spotlighted at a time.
import { lazy, Suspense } from "react";
import { registerAdminTab, registerPage, registerPagePart, type AdminTabProps } from "../registry";
import { EventHero } from "./EventHero";
import "./events.css";

const EventsTab = lazy(() => import("./EventsTab"));
const FEATURE = "events";

registerPage({ feature: FEATURE, path: /^\/event\/(?<slug>[a-z0-9][a-z0-9-]{1,38}[a-z0-9])\/?$/, shell: "app", load: () => import("./EventPage") });
registerPagePart({ feature: FEATURE, key: "event-hero", page: "home", order: 4, Component: EventHero });
registerAdminTab({
  feature: FEATURE,
  key: "events",
  label: "Events",
  order: 85,
  permission: "events.manage",
  Component: (props: AdminTabProps) => (
    <Suspense fallback={<p className="note" role="status">Loading…</p>}>
      <EventsTab {...props} />
    </Suspense>
  ),
});
