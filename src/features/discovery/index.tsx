// A1 discovery (PRD A1, backend: startng-be app/features/discovery, flag "discovery"). Adds the homepage shelves, "Play
// next" on game pages, the featuring checklist in Your games and the Featured admin tab.
import { lazy, Suspense } from "react";
import { registerAdminTab, registerPagePart, registerYourGamePart, type AdminTabProps } from "../registry";
import PlayNext from "./PlayNext";
import Shelves from "./Shelves";
import YourFeaturing from "./YourFeaturing";
import "./discovery.css";

const FeaturedTab = lazy(() => import("./FeaturedTab"));
const FEATURE = "discovery";

registerPagePart({ feature: FEATURE, key: "shelves", page: "home", order: 50, Component: Shelves });
registerPagePart({ feature: FEATURE, key: "play-next", page: "game", order: 90, Component: PlayNext });
registerYourGamePart({ feature: FEATURE, key: "featuring", order: 40, Component: YourFeaturing });
registerAdminTab({
  feature: FEATURE,
  key: "featured",
  label: "Featured",
  order: 70,
  permission: "featured.edit",
  Component: (props: AdminTabProps) => (
    <Suspense fallback={null}>
      <FeaturedTab {...props} />
    </Suspense>
  ),
});
