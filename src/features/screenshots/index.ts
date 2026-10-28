// Screenshots (Ziki #19, Oluwaseyifunmi). The flag is "screenshots" (startng-be app/features/screenshots). Adds the
// pictures a game's startng.json lists ("screenshots": [...]) to its page, under the share row.
import { registerPagePart } from "../registry";
import GameScreenshots from "./GameScreenshots";
import "./screenshots.css";

registerPagePart({ feature: "screenshots", key: "screenshots", page: "game", order: 50, Component: GameScreenshots });
