// Remix this game (Ziki #83, Moronke). The flag is "remix" (startng-be app/features/remix). Adds the remix lines to a
// game's page: where it was remixed from, how many times it was remixed, and a Remix it button when its creator allows it.
import { registerPagePart } from "../registry";
import GameRemix from "./GameRemix";

const FEATURE = "remix";

registerPagePart({ feature: FEATURE, key: "game-remix", page: "game", order: 160, Component: GameRemix });
