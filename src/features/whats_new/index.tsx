// "What's new" game updates: shows "Updated" badge on recently updated game cards
// and a "What's new" box on game pages.
import { registerCardPart, registerPagePart } from "../registry";
import { isRecentlyUpdated } from "../../games";
import WhatsNewBox from "./WhatsNewBox";
import "./whats_new.css";

const FEATURE = null; // Always active on card and game page slots

registerCardPart({
  feature: FEATURE,
  key: "whats-new-badge",
  slot: "badges",
  order: 15,
  render: (game) => {
    if (!isRecentlyUpdated(game.updated_at)) return null;
    return <span className="tag updated-badge">Updated</span>;
  },
});

registerPagePart({
  feature: FEATURE,
  key: "whats-new-box",
  page: "game",
  order: 25,
  Component: WhatsNewBox,
});
