// Majors: big public tournaments run with a partner, with real prizes. The flag is "majors" (the same as NAME in
// startng-be app/features/majors). Adds the major's page (/majors/<slug>), the list (/majors), a banner on the home and
// tournament pages while one is on, and an admin tab to make them from a template.
import { lazy, Suspense } from "react";
import { registerAdminTab, registerPage, registerPagePart, type AdminTabProps, type PagePartProps } from "../registry";

const MajorsTab = lazy(() => import("./MajorsTab"));
const MajorBanner = lazy(() => import("./MajorBanner"));
const FEATURE = "majors";

registerPage({ feature: FEATURE, path: /^\/majors\/?$/, shell: "app", load: () => import("./MajorsList") });
registerPage({ feature: FEATURE, path: /^\/majors\/(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)\/?$/, shell: "app", load: () => import("./MajorPage") });

const Banner = (props: PagePartProps) => <Suspense fallback={null}><MajorBanner {...props} /></Suspense>;
registerPagePart({ feature: FEATURE, key: "major-banner", page: "home", order: 5, Component: Banner });
registerPagePart({ feature: FEATURE, key: "major-banner", page: "tournament", order: 5, Component: Banner });

registerAdminTab({
  feature: FEATURE,
  key: "majors",
  label: "Majors",
  order: 96,
  permission: "majors.manage",
  Component: (props: AdminTabProps) => (
    <Suspense fallback={<p className="note" role="status">Loading…</p>}>
      <MajorsTab {...props} />
    </Suspense>
  ),
});
