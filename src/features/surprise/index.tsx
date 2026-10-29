// Surprise me (Ziki #18, Daniel). The flag is "surprise" (startng-be app/features/surprise).
// A "Surprise me" button on the homepage and on /games that opens a random live game.
import { registerPagePart } from "../registry";
import SurpriseMe from "./SurpriseMe";
import "./surprise.css";

registerPagePart({ feature: "surprise", key: "surprise-home", page: "home", order: 10, Component: SurpriseMe });
registerPagePart({ feature: "surprise", key: "surprise-games", page: "games", order: 10, Component: (p) => <SurpriseMe {...p} inPage /> });
