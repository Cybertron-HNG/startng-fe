// Tip a creator (Ziki #82, Moronke). The flag is "tips" (startng-be app/features/tips; it needs "wardrobe" for coins).
// Adds a Tip the creator box to a game's page, with its creator's supporters, and the tips a game got in Your games.
import { registerPagePart, registerYourGamePart } from "../registry";
import TipBox from "./TipBox";
import YourTips from "./YourTips";

const FEATURE = "tips";

registerPagePart({ feature: FEATURE, key: "tip-box", page: "game", order: 120, Component: TipBox });
registerYourGamePart({ feature: FEATURE, key: "tips", order: 70, Component: YourTips });
