// Friends & follows (PRD S2): API calls (startng-be app/features/follows).
import type { Character } from "../../character";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

/** A player as others see them: name and character only (the API never sends an email). */
export type Player = { id: number; name: string | null; character: Character | null };
export type People = { count: number; people: Player[] };
/** Counts are public; you_follow and friends are about the signed-in viewer (false when signed out). */
export type FollowState = { user_id: number; followers: number; following: number; you_follow: boolean; friends: boolean };
export type Invite = { code: string; path: string; expires_at: string };
export type InvitePreview = { inviter: Player; expires_at: string };
export type ListKind = "friends" | "following" | "followers";

/** An error from the API, with its machine-readable code (for example "invite_not_found"). */
export class FollowsError extends Error {
  constructor(message: string, readonly status: number, readonly code: string | null) {
    super(message);
  }
}

const token = () => localStorage.getItem("token");
export const signedIn = () => !!token();
const headers = (): HeadersInit => (token() ? { Authorization: `Bearer ${token()}` } : {});

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: headers() });
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const body = (data ?? {}) as { detail?: unknown; errors?: { code?: unknown }[] };
    const message = typeof body.detail === "string" ? body.detail : "Something went wrong. Try again.";
    const code = body.errors?.[0]?.code;
    throw new FollowsError(message, res.status, typeof code === "string" ? code : null);
  }
  return data as T;
}

export const followState = (userId: number) => call<FollowState>(`/follows/${userId}`);
export const follow = (userId: number) => call<FollowState>(`/follows/${userId}`, { method: "PUT" });
export const unfollow = (userId: number) => call<void>(`/follows/${userId}`, { method: "DELETE" });
export const myPeople = (kind: ListKind) => call<People>(`/me/${kind}`);
/** A game's creator and whether you follow them, for the Follow button on the game's page (Ziki #42). */
export type GameCreator = { game: string; creator: Player; state: FollowState };
export const gameCreator = (game: string) => call<GameCreator>(`/follows/game/${encodeURIComponent(game)}`);
/** The newest games from creators you follow (names, newest first), for the homepage row. following 0: show nothing. */
export const followingGames = () => call<{ following: number; games: { name: string }[] }>("/me/following/games");
export const makeInvite = () => call<Invite>("/friend-invites", { method: "POST" });
export const previewInvite = (code: string) => call<InvitePreview>(`/friend-invites/${encodeURIComponent(code)}`);
export const acceptInvite = (code: string) =>
  call<{ friend: Player }>(`/friend-invites/${encodeURIComponent(code)}/accept`, { method: "POST" });

/** How a player's name is shown: their character's name, then their account name. */
export const displayName = (p: Player) => p.character?.name || p.name || "A player";
