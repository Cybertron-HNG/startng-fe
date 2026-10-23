// Tags and category pages (Chloe). The flag is "tags" (startng-be app/features/tags). Adds: "Pick a category" on the homepage,
// "Browse by category" on /games, a game's categories on its page, and an admin tab to approve tags. The /categories pages
// themselves are written by the server (nginx.conf asks the API), and React does not start on them (src/main.tsx).
import { lazy, Suspense } from "react";
import { registerAdminTab, registerPagePart, type AdminTabProps } from "../registry";
import CategoriesHome from "./CategoriesHome";
import CategoriesRow from "./CategoriesRow";
import GameTags from "./GameTags";
import "./tags.css";

const TagsTab = lazy(() => import("./TagsTab"));
const FEATURE = "tags";

registerPagePart({ feature: FEATURE, key: "categories-home", page: "home", order: 50, Component: CategoriesHome });
registerPagePart({ feature: FEATURE, key: "categories-row", page: "games", Component: CategoriesRow });
registerPagePart({ feature: FEATURE, key: "game-tags", page: "game", order: 150, Component: GameTags });
registerAdminTab({
  feature: FEATURE,
  key: "tags",
  label: "Tags",
  order: 80,
  permission: "tags.manage",
  Component: (props: AdminTabProps) => (
    <Suspense fallback={null}>
      <TagsTab {...props} />
    </Suspense>
  ),
});
