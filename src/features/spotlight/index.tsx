// A2 spotlight (PRD A2, backend: startng-be app/features/spotlight, flag "spotlight"). The homepage shows the Game of
// the Week and the daily challenge; admins pick the Game of the Week in the Spotlight tab.
import { lazy, Suspense } from "react";
import { registerAdminTab, registerPagePart, type AdminTabProps } from "../registry";
import Banner from "./Banner";
import "./spotlight.css";

const SpotlightTab = lazy(() => import("./SpotlightTab"));
const FEATURE = "spotlight";

registerPagePart({ feature: FEATURE, key: "banner", page: "home", order: 40, Component: Banner });
registerAdminTab({
  feature: FEATURE,
  key: "spotlight",
  label: "Spotlight",
  order: 71,
  permission: "spotlight.edit",
  Component: (props: AdminTabProps) => (
    <Suspense fallback={null}>
      <SpotlightTab {...props} />
    </Suspense>
  ),
});
