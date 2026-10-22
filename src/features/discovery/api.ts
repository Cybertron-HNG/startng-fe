// A1 discovery: API calls (startng-be app/features/discovery).
import { call, send } from "../../api";

export type Shelves = { featured: string[]; staff: string[]; new: string[]; most_played: string[]; most_improved: string[]; continue_playing: string[] };
export type Check = { key: string; label: string; ok: boolean; required: boolean };
export type Featuring = { featured: boolean; staff_pick: boolean; eligible: boolean; checks: Check[] };
export type AdminGame = { game: string; title: string; eligible: boolean; missing: string[] };
export type AdminFeatured = { featured: AdminGame[]; staff: AdminGame[]; candidates: AdminGame[] };
export type Shelf = "featured" | "staff";

const token = () => localStorage.getItem("token");
const enc = encodeURIComponent;

export const getShelves = () => call<Shelves>(token(), "/discover/shelves");
export const getPlayNext = (after: string) => call<{ games: string[] }>(token(), `/discover/next?after=${enc(after)}`);
export const getFeaturing = (game: string) => call<Featuring>(token(), `/games/${enc(game)}/featuring`);

export const adminFeatured = () => call<AdminFeatured>(token(), "/admin/featured");
export const addFeatured = (shelf: Shelf, game: string) => call<void>(token(), `/admin/featured/${shelf}/${enc(game)}`, send("PUT"));
export const removeFeatured = (shelf: Shelf, game: string) => call<void>(token(), `/admin/featured/${shelf}/${enc(game)}`, send("DELETE"));
export const moveFeatured = (shelf: Shelf, game: string, direction: "up" | "down") =>
  call<void>(token(), `/admin/featured/${shelf}/${enc(game)}/move?direction=${direction}`, send("POST"));
