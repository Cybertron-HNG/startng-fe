// Player Pulse (Ziki #58, Daniel). The flag is "player_pulse" (startng-be app/features/player_pulse).
// Your games gets "What players say" under each game: how this week's players said a round felt.
import { registerYourGamePart } from "../registry";
import WhatPlayersSay from "./WhatPlayersSay";

registerYourGamePart({ feature: "player_pulse", key: "pulse", order: 60, Component: WhatPlayersSay });
