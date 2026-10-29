// Live (Ziki #37, Daniel). The flag is "live" (startng-be app/features/live). Real signs of play so start.ng doesn't look
// empty: "N playing now" on cards and game pages, a "Happening now" strip on the homepage, and players on today's
// tournament games.
import { registerCardPart, registerPagePart } from "../registry";
import { CardPlaying, GamePlaying, LiveStrip, TournamentPlaying } from "./LiveParts";

registerCardPart({ feature: "live", key: "playing-now", slot: "stats", order: 50, render: (game) => <CardPlaying game={game} /> });
registerPagePart({ feature: "live", key: "playing-now", page: "game", order: 5, Component: GamePlaying });
registerPagePart({ feature: "live", key: "live-strip", page: "home", order: 20, Component: LiveStrip });
registerPagePart({ feature: "live", key: "tournament-playing", page: "tournament", order: 5, Component: TournamentPlaying });
