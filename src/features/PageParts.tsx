import Boundary from "./Boundary";
import { useFeatures } from "./flags";
import { pagePartsFor, type PagePartProps, type PageSlot } from "./registry";

/** The boxes features add to one of start.ng's pages (registerPagePart), each behind its flag and error boundary. */
export default function PageParts({ page, ...props }: PagePartProps & { page: PageSlot }) {
  const isOn = useFeatures();
  return (
    <>
      {pagePartsFor(page).filter((p) => isOn(p.feature)).map((p) => (
        <Boundary key={p.key} name={p.feature ?? p.key}>
          <p.Component {...props} />
        </Boundary>
      ))}
    </>
  );
}
