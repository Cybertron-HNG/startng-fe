// Majors' API calls (startng-be app/features/majors).
import { call, send, type BoardStat } from "../../api";

export type Prize = { place: number; prize: string };
export type Partner = { name: string; url: string | null; logo_url: string | null };
export type State = "upcoming" | "running" | "ended";
export type Summary = {
  slug: string; title: string; tagline: string; partner: Partner; prizes: Prize[];
  starts_at: string; ends_at: string; state: State; entrants: number; games: string[];
};
export type Run = { rank: number; player_id: number; name: string; color: string | null; stats: Record<string, number>; points: number };
export type GameBoard = { name: string; url: string; cover_url: string | null; description: string | null; leaderboard: BoardStat[]; players: number; top: Run[]; mine: Run | null };
export type Standing = { place: number; player_id: number; name: string; color: string | null; points: number; firsts: number; games_played: number };
export type Winner = { place: number; prize: string; player_id: number; name: string; color: string | null; points: number };
export type Major = Summary & {
  about: string | null; cta_label: string | null; cta_url: string | null; published: boolean;
  entered: boolean; removed: boolean; played: number; game_boards: GameBoard[]; standings: Standing[]; me: Standing | null; winners: Winner[];
};

/** A major as the admin form sends it. It is also the template: copy it, change the words, and it's the next one. */
export type MajorBody = {
  slug: string; title: string; tagline: string; about: string | null;
  partner_name: string; partner_url: string | null; partner_logo_url: string | null;
  cta_label: string | null; cta_url: string | null; prizes: Prize[]; games: string[];
  starts_at: string | null; ends_at: string | null;
};
export type Template = { key: string; label: string; note: string | null; major: MajorBody };
export type AdminMajor = Summary & {
  about: string | null; cta_label: string | null; cta_url: string | null; published: boolean; link: string;
  winners: (Winner & { email: string })[]; template: MajorBody;
};
export type AdminEntry = {
  player_id: number; name: string; email: string; joined_at: string; removed: boolean; removed_note: string | null;
  points: number; place: number | null;
};

const t = () => localStorage.getItem("token");
const at = (slug: string) => `/majors/${encodeURIComponent(slug)}`;

export const listMajors = () => call<Summary[]>(null, "/majors");
export const getMajor = (slug: string) => call<Major>(t(), at(slug));
export const enterMajor = (slug: string) => call<Major>(t(), `${at(slug)}/enter`, send("POST"));
export const leaveMajor = (slug: string) => call<void>(t(), `${at(slug)}/entry`, send("DELETE"));

export const adminList = () => call<AdminMajor[]>(t(), "/admin/majors");
export const adminTemplates = () => call<Template[]>(t(), "/admin/majors/templates");
export const adminPreview = (slug: string) => call<Major>(t(), `/admin${at(slug)}`);
export const adminCreate = (body: MajorBody) => call<AdminMajor>(t(), "/admin/majors", send("POST", body));
export const adminUpdate = (slug: string, body: MajorBody) => call<AdminMajor>(t(), `/admin${at(slug)}`, send("PUT", body));
export const adminPublish = (slug: string, on: boolean) => call<AdminMajor>(t(), `/admin${at(slug)}/${on ? "publish" : "unpublish"}`, send("POST"));
export const adminDelete = (slug: string) => call<void>(t(), `/admin${at(slug)}`, send("DELETE"));
export const adminEntries = (slug: string) => call<AdminEntry[]>(t(), `/admin${at(slug)}/entries`);
export const adminRemove = (slug: string, userId: number, note: string) => call<void>(t(), `/admin${at(slug)}/entries/${userId}/remove`, send("POST", { note }));
export const adminRestore = (slug: string, userId: number) => call<void>(t(), `/admin${at(slug)}/entries/${userId}/restore`, send("POST"));

/** "1st", "2nd", "3rd", "4th"... */
export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
export const gameTitle = (name: string) => name.replace(/-/g, " ");
