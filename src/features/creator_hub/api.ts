// Creator hub (PRD T2): API calls (startng-be app/features/creator_hub).
import { call, send } from "../../api";
import type { Character } from "../../character";

export type CreatorGame = { name: string; title: string; cover_url: string | null; plays_30: number };
export type Creator = {
  id: number; slug: string; name: string; character: Character | null; bio: string | null; games: CreatorGame[];
  total_plays: number; players_30: number; followers: number | null; me: boolean;
};
export type Leader = { id: number; slug: string; name: string; character: Character | null; games: number; players_30: number; plays_30: number };
export type GameStats = {
  game: string; title: string; hidden: string | null; plays_7: number; plays_30: number; plays_all: number; visitors_30: number;
  players_30: number; repeat_players_30: number; runs_30: number; avg_session_seconds: number | null; change_7: number;
  trend: { day: string; plays: number }[];
  embed_plays_30?: number;
};
export type Dashboard = { games: GameStats[]; best_game: string | null; plays_7: number; plays_30: number; visitors_30: number };

const token = () => localStorage.getItem("token");

export const getCreator = (id: number) => call<Creator>(token(), `/by/${id}`);
export const getLeaders = () => call<Leader[]>(null, "/by");
export const saveBio = (bio: string) => call<{ bio: string | null }>(token(), "/me/creator-bio", send("PUT", { bio }));
export const getDashboard = () => call<Dashboard>(token(), "/me/creator-dashboard");
