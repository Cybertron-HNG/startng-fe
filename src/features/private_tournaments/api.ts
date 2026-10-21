// Private tournaments' API calls (startng-be app/features/private_tournaments).
import type { BoardStat } from "../../api";
const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type Summary = {
  code: string; title: string; owner: string; starts_at: string; ends_at: string; finished: boolean;
  members: number; games: string[]; joined: boolean; mine: boolean; crew_id: number | null;
};
export type Run = { rank: number; player_id: number; name: string; color: string | null; stats: Record<string, number>; points: number };
export type GameBoard = { name: string; url: string; cover_url: string | null; leaderboard: BoardStat[]; players: number; top: Run[] };
export type Standing = { place: number; player_id: number; name: string; color: string | null; points: number; firsts: number };
export type Detail = Summary & { game_boards: GameBoard[]; standings: Standing[]; me: Standing | null };
export const isDetail = (t: Summary | Detail): t is Detail => "standings" in t;

const token = () => localStorage.getItem("token");
const headers = (json = false): HeadersInit => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
});

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/private-tournaments${path}`, init);
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Something went wrong. Try again.");
  return data;
}

export const createTournament = (body: { title: string; games: string[]; hours: number; crew_id?: number }) =>
  call<Summary>("", { method: "POST", headers: headers(true), body: JSON.stringify(body) });
export const myTournaments = () => call<Summary[]>("/mine", { headers: headers() });
export const getTournament = (code: string) => call<Summary | Detail>(`/${encodeURIComponent(code)}`, { headers: headers() });
export const joinTournament = (code: string) => call<Summary>(`/${encodeURIComponent(code)}/join`, { method: "POST", headers: headers() });
export const leaveTournament = (code: string) => call<void>(`/${encodeURIComponent(code)}/members/me`, { method: "DELETE", headers: headers() });
export const deleteTournament = (code: string) => call<void>(`/${encodeURIComponent(code)}`, { method: "DELETE", headers: headers() });
export const newInviteLink = (code: string) => call<Summary>(`/${encodeURIComponent(code)}/new-link`, { method: "POST", headers: headers() });
export const crewTournaments = (crewId: number) => call<Summary[]>(`/crew/${crewId}`, { headers: headers() });
