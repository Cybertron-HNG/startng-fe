// A2 spotlight: API calls (startng-be app/features/spotlight).
import { call, send } from "../../api";

export type Pick = { game: string; title: string; cover_url: string | null; note: string | null; week_start: string };
export type Challenge = {
  day: string; game: string; game_title: string; cover_url: string | null; stat: string; goal: number; goal_shown: string;
  goal_is_a_ceiling: boolean; ends_at: string; done: boolean | null; best: string | null;
};
export type Spotlight = { game_of_the_week: Pick | null; challenge: Challenge | null };
export type AdminPick = { week_start: string; game: string; title: string; note: string | null; picked_by: string };
export type AdminSpotlight = { picks: AdminPick[]; games: string[]; challenge: Challenge | null };

const token = () => localStorage.getItem("token");

export const getSpotlight = () => call<Spotlight>(token(), "/spotlight");
export const adminSpotlight = () => call<AdminSpotlight>(token(), "/admin/spotlight");
export const pickGameOfTheWeek = (game: string, note: string, week: string) =>
  call<void>(token(), "/admin/spotlight/game-of-the-week", send("PUT", { game, note: note || null, week: week || null }));
export const clearGameOfTheWeek = (week: string) => call<void>(token(), `/admin/spotlight/game-of-the-week?week=${encodeURIComponent(week)}`, send("DELETE"));
