import { EVENT_HOME_KEEPS, useEventMode } from "../eventMode";
import Boundary from "./Boundary";
import { useFeatures } from "./flags";
import { pagePartsFor, type PagePartProps, type PageSlot } from "./registry";

/** The boxes features add to one of start.ng's pages (registerPagePart), each behind its flag and error boundary. */
export default function PageParts({ page, ...props }: PagePartProps & { page: PageSlot }) {
  const isOn = useFeatures();
  const { ready, event } = useEventMode();
  // While an event is spotlighted only EVENT_HOME_KEEPS stay on the homepage; until we know, the homepage waits (no flash).
  const shown = (key: string) => page !== "home" || (ready && (!event || EVENT_HOME_KEEPS.includes(key)));
  return (
    <>
      {pagePartsFor(page).filter((p) => isOn(p.feature) && shown(p.key)).map((p) => (
        <Boundary key={p.key} name={p.feature}>
          <p.Component {...props} />
        </Boundary>
      ))}
    </>
  );
}
