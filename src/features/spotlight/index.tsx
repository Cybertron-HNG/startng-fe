// A2 spotlight (Hamzat, for Ade). The flag is "spotlight" (startng-be app/features/spotlight; needs "progress").
// /spotlight shows the Game of the Week and today's daily challenge; the homepage and game pages point at them.
import { lazy, Suspense } from "react";
import { registerAdminTab, registerPage, registerPagePart, type AdminTabProps } from "../registry";
import { GameChallenge, HomeSpotlight, WeekTag } from "./HomeSpotlight";
import "./spotlight.css";

const SpotlightTab = lazy(() => import("./SpotlightTab"));
const FEATURE = "spotlight";

registerPage({ feature: FEATURE, path: "/spotlight", shell: "app", load: () => import("./SpotlightPage") });
registerPagePart({ feature: FEATURE, key: "spotlight", page: "home", order: 10, Component: HomeSpotlight });
registerPagePart({ feature: FEATURE, key: "week-tag", page: "game", order: 5, Component: WeekTag });
registerPagePart({ feature: FEATURE, key: "game-challenge", page: "game", order: 1, Component: GameChallenge });
registerAdminTab({
  feature: FEATURE,
  key: "spotlight",
  label: "Spotlight",
  order: 80,
  permission: "spotlight.edit",
  Component: (props: AdminTabProps) => (
    <Suspense fallback={null}>
      <SpotlightTab {...props} />
    </Suspense>
  ),
});
