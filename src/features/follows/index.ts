// Friends & follows (PRD S2, owner: Seyi): follow players, friends when it's mutual, invite links.
// The flag is "follows" (the same as NAME in startng-be app/features/follows).
// Other features show the Follow button with: import FollowButton from "../follows/FollowButton";
import { registerPage, registerPagePart, registerProfileSection } from "../registry";
import { FollowingGames, GameCreatorFollow } from "./CreatorsYouFollow";
import ProfileFriends from "./ProfileFriends";

const FEATURE = "follows";

// Your friends, following and followers, and your invite link.
registerPage({ feature: FEATURE, path: "/follows", shell: "app", load: () => import("./FollowsPage") });
// An invite link: start.ng/f/<code>.
registerPage({ feature: FEATURE, path: /^\/f\/(?<code>[\w-]{8,16})\/?$/, shell: "app", load: () => import("./InvitePage") });
// Follower counts and the Follow button on a player's profile (shown by the profile page, S1).
registerProfileSection({ feature: FEATURE, key: "follows", title: "Friends", Component: ProfileFriends });
// Ziki #42: follow a game's creator from the game's page, and their new games on the homepage.
registerPagePart({ feature: FEATURE, key: "game-creator-follow", page: "game", order: 2, Component: GameCreatorFollow });
registerPagePart({ feature: FEATURE, key: "following-games", page: "home", order: 95, Component: FollowingGames });
