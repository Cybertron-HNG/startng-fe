// Scoped leaderboards' API calls (startng-be app/features/scoped_boards).
import type { LeaderboardEntry } from "../../api";
import type { OverallEntry } from "../../api";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const auth = (): HeadersInit => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/boards${path}`, { headers: auth() });
  if (!res.ok) throw new Error("Could not load this board");
  return res.json();
}

/** A scope as the API names it: "crew:12". */
export const crewScope = (id: number) => `crew:${id}`;

export const scopedOverall = (scope: string, period: "all" | "week", limit = 50) =>
  get<OverallEntry[]>(`/overall?${new URLSearchParams({ scope, period, limit: String(limit) })}`);
export const scopedGame = (game: string, scope: string, limit = 10) =>
  get<LeaderboardEntry[]>(`/game/${encodeURIComponent(game)}?${new URLSearchParams({ scope, limit: String(limit) })}`);
