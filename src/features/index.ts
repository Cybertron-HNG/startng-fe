// Every feature, ONE line each: importing it runs its index.ts, which registers its pages, card parts, admin tabs
// and profile sections (src/features/registry.ts). Copy src/features/_template to start a feature.
// import "./wardrobe";
import "./private_tournaments";
import "./follows";
import "./integrity";
import "./moderation"; // H2 name filter (Hamzat)
import "./integrity/owner"; // score integrity: held scores in Your games (Dean)
import "./needs_fixing"; // H2 "needs fixing" label (Hamzat)
import "./duplicates"; // H2 duplicate finder (Hamzat)
import "./email"; // H1 email and notifications (Hamzat)
import "./game_health"; // H2 game health checks (Hamzat)
import "./share"; // B2 share cards (Hamzat, for Bumblebee)
export {};
