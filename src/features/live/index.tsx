// Live (Ziki #37, Daniel). The flag is "live" (startng-be app/features/live). Real signs of play so start.ng doesn't look
// empty: "N playing now" on cards and game pages, and players on today's
// tournament games.
import { registerCardPart, registerPagePart } from "../registry";
import { CardPlaying, GamePlaying, TournamentPlaying } from "./LiveParts";

registerCardPart({ feature: "live", key: "playing-now", slot: "stats", order: 50, render: (game) => <CardPlaying game={game} /> });
registerPagePart({ feature: "live", key: "playing-now", page: "game", order: 5, Component: GamePlaying });
// The homepage "Happening now" strip is switched off (Tolu, 9 Nov): the home page stays uncrowded. LiveStrip is kept in LiveParts for later.
registerPagePart({ feature: "live", key: "tournament-playing", page: "tournament", order: 5, Component: TournamentPlaying });
