// Crews' API calls (startng-be app/features/crews).
const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export const KINDS = ["family", "school", "class", "city", "friends"] as const;
export type Kind = (typeof KINDS)[number];
export type CrewSummary = { id: number; name: string; kind: Kind; members: number; mine: boolean };
export type Person = { player_id: number; name: string; color: string | null; owner: boolean; joined_at: string };
export type Crew = CrewSummary & { code: string; people: Person[] };
export type Invite = { code: string; name: string; kind: Kind; owner: string; members: number; joined: boolean; full: boolean };

const token = () => localStorage.getItem("token");
const headers = (json = false): HeadersInit => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
});

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/crews${path}`, init);
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Something went wrong. Try again.");
  return data;
}

export const createCrew = (body: { name: string; kind: Kind }) => call<Crew>("", { method: "POST", headers: headers(true), body: JSON.stringify(body) });
export const myCrews = () => call<CrewSummary[]>("/mine", { headers: headers() });
export const getCrew = (id: number) => call<Crew>(`/${id}`, { headers: headers() });
export const getInvite = (code: string) => call<Invite>(`/join/${encodeURIComponent(code)}`, { headers: headers() });
export const joinCrew = (code: string) => call<Crew>(`/join/${encodeURIComponent(code)}`, { method: "POST", headers: headers() });
export const leaveCrew = (id: number) => call<void>(`/${id}/members/me`, { method: "DELETE", headers: headers() });
export const removeMember = (id: number, playerId: number) => call<void>(`/${id}/members/${playerId}`, { method: "DELETE", headers: headers() });
export const newCrewLink = (id: number) => call<Crew>(`/${id}/new-link`, { method: "POST", headers: headers() });
export const deleteCrew = (id: number) => call<void>(`/${id}`, { method: "DELETE", headers: headers() });
