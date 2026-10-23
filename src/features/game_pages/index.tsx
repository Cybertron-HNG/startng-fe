// A game's own pages (Chloe). The flag is "game_pages" (startng-be app/features/game_pages). Adds: links to a game's about,
// how to play, FAQ and walkthrough pages on its page, and an admin tab to make, edit and approve them. The pages themselves
// are written by the server (nginx.conf asks the API), and React does not start on them (src/main.tsx).
import { lazy, Suspense } from "react";
import { registerAdminTab, registerPagePart, type AdminTabProps } from "../registry";
import GamePages from "./GamePages";
import "./game_pages.css";

const PagesTab = lazy(() => import("./PagesTab"));
const FEATURE = "game_pages";

registerPagePart({ feature: FEATURE, key: "game-pages", page: "game", order: 160, Component: GamePages });
registerAdminTab({
  feature: FEATURE,
  key: "game-pages",
  label: "Game pages",
  order: 90,
  permission: "gamepages.manage",
  Component: (props: AdminTabProps) => (
    <Suspense fallback={null}>
      <PagesTab {...props} />
    </Suspense>
  ),
});
