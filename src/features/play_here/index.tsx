// Play here (Ziki #21). The flag is "play_here" (startng-be app/features/play_here). Adds a Play here button next to Play
// on a game's page; it runs the game in a frame on the page, with Full screen and Open in new tab, so the leaderboard,
// categories and share buttons stay in view. The address gets ?play=here, which the server-written page links to as well.
import { registerPagePart } from "../registry";
import { PlayHereButton, PlayHereFrame } from "./PlayHere";

const FEATURE = "play_here";

registerPagePart({ feature: FEATURE, key: "play-here-button", page: "game-actions", Component: PlayHereButton });
registerPagePart({ feature: FEATURE, key: "play-here-frame", page: "game", order: 1, Component: PlayHereFrame });
