// Crews (PRD Tr1): saved groups of players (a family, a class, a city) with one invite link.
// The flag is "crews" (the same as NAME in startng-be app/features/crews).
import { registerPage } from "../registry";

const FEATURE = "crews";

registerPage({ feature: FEATURE, path: "/crews", shell: "app", load: () => import("./MyCrews") });
registerPage({ feature: FEATURE, path: /^\/crews\/(?<id>\d{1,10})\/?$/, shell: "app", load: () => import("./CrewPage") });
registerPage({ feature: FEATURE, path: /^\/join\/(?<code>[\w-]{8,16})\/?$/, shell: "app", load: () => import("./JoinCrew") });
