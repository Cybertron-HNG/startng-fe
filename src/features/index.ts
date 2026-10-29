// Every feature, ONE line each: importing it runs its index.ts, which registers its pages, card parts, admin tabs
// and profile sections (src/features/registry.ts). Copy src/features/_template to start a feature.
import "./private_tournaments";
import "./follows";
import "./integrity";
import "./moderation"; // H2 name filter (Hamzat)
import "./integrity/owner"; // score integrity: held scores in Your games (Dean)
import "./needs_fixing"; // H2 "needs fixing" label (Hamzat)
import "./duplicates"; // H2 duplicate finder (Hamzat)
import "./email"; // H1 email and notifications (Hamzat)
import "./game_health"; // H2 game health checks (Hamzat)
import "./github_app"; // F1 GitHub App: a push goes live straight away (Hamzat)
import "./game_review"; // F2 admin review before a new game is listed (Hamzat)
import "./leagues"; // M2 leagues (Mo)
import "./profiles"; // S1 player profiles and badges (Hamzat, for Seyi)
import "./catalog"; // T1 categories, ratings and filters (Hamzat, for Tega)
import "./discovery"; // A1 discovery: shelves and ranking (Hamzat, for Ade)
import "./spotlight"; // A2 Game of the Week and the daily challenge (Hamzat, for Ade)
import "./share_cards";
import "./challenges";
import "./creator_hub"; // T2 creator hub (Hamzat, for Tega)
import "./live"; // Ziki #37 live: playing now and the homepage strip (Daniel)
import "./surprise"; // Ziki #18 Surprise me: a random game on / and /games (Daniel)
import "./wardrobe"; // wardrobe rewards: coins, rarity items and the shop (Kaka)
import "./support"; // F10 Help button and problem reports (Hamzat)
import "./tags"; // tags and category pages (Chloe)
import "./game_pages"; // a game's about, how to play, FAQ and walkthrough pages (Chloe)
import "./feature_toggle"; // admin Features tab: switch features on and off (Hamzat)
import "./jams"; // Ziki #35: monthly game jams (Oluwaseyifunmi)
export {};
