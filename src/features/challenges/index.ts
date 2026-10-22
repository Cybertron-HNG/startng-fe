// Challenge links (PRD B1, built by Hamzat for Bumblebee): "Beat my score". The flag is "challenges"
// (startng-be app/features/challenges). Needs the "progress" and "share" flags too.
import { registerPage, registerPagePart } from "../registry";
import ChallengeButton from "./ChallengeButton";

const FEATURE = "challenges";

// start.ng/c/<code>: someone's challenge.
registerPage({ feature: FEATURE, path: /^\/c\/(?<code>[\w-]{8,16})\/?$/, shell: "app", load: () => import("./ChallengePage") });
// "Challenge a friend" on every game's page.
registerPagePart({ feature: FEATURE, key: "challenge", page: "game", Component: ChallengeButton });
