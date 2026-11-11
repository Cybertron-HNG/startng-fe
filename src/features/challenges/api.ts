// Challenge links' API calls (startng-be app/features/challenges).
import type { Character } from "../../character";
const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type Player = { id: number; name: string; character: Character | null };
export type Attempt = { player: Player; best: number | null; best_text: string | null; beaten: boolean; short_by: number | null };
export type Challenge = {
  code: string; url: string; challenger: Player; score: number; score_text: string; created_at: string; expires_at: string;
  game: { name: string; title: string; url: string; cover_url: string | null; stat: { key: string; label: string; order: "highest" | "lowest"; format: "number" | "time" } };
  mine: boolean; me: Attempt | null; attempts: Attempt[]; takers: number;
};

const token = () => localStorage.getItem("token");
const headers = (json = false): HeadersInit => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
});

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/challenges${path}`, init);
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(typeof data.detail === "string" ? data.detail : "Something went wrong. Try again."), { status: res.status });
  return data;
}

/** From your best run on a game (or one run, from the Kit's end-of-round card). */
export const createChallenge = (from: { game: string } | { run_id: number }) =>
  call<Challenge>("", { method: "POST", headers: headers(true), body: JSON.stringify(from) });
/** Whether you have a run on a game to challenge with: its page only offers "Challenge a friend" then. */
export const canChallenge = (game: string) => call<{ can: boolean }>(`/can/${encodeURIComponent(game)}`, { headers: headers() });
export const getChallenge = (code: string) => call<Challenge>(`/${encodeURIComponent(code)}`, { headers: headers() });
export const acceptChallenge = (code: string) => call<Challenge>(`/${encodeURIComponent(code)}/accept`, { method: "POST", headers: headers() });
export const deleteChallenge = (code: string) => call<void>(`/${encodeURIComponent(code)}`, { method: "DELETE", headers: headers() });
