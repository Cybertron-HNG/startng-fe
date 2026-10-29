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

export type QuickMessage = {
  id: number;
  sender: Player;
  recipient_id: number;
  preset: string;
  game_name?: string | null;
  challenge_code?: string | null;
  created_at: string;
  read_at?: string | null;
};

export type QuickMessagesList = {
  count: number;
  messages: QuickMessage[];
};

export const QUICK_MESSAGE_PRESETS = [
  "GG! 🔥",
  "Rematch?",
  "Beat my score 😏",
  "Nice one 👏",
  "Well played!",
  "You're on fire! 🚀",
  "Catch me if you can 🏃",
  "So close! 🤏",
  "🔥",
  "👏",
  "😏",
  "🚀",
  "👑",
  "🎯",
] as const;

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
  const mergedHeaders: Record<string, string> = {
    ...(headers() as Record<string, string>),
    ...((init?.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: mergedHeaders });
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
export const makeInvite = () => call<Invite>("/friend-invites", { method: "POST" });
export const previewInvite = (code: string) => call<InvitePreview>(`/friend-invites/${encodeURIComponent(code)}`);
export const acceptInvite = (code: string) =>
  call<{ friend: Player }>(`/friend-invites/${encodeURIComponent(code)}/accept`, { method: "POST" });

export const sendQuickMessage = (
  recipientId: number,
  preset: string,
  gameName?: string,
  challengeCode?: string,
) =>
  call<QuickMessage>("/friends/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient_id: recipientId,
      preset,
      game_name: gameName,
      challenge_code: challengeCode,
    }),
  });

export const getQuickMessages = () => call<QuickMessagesList>("/friends/messages");
export const markQuickMessageRead = (id: number) =>
  call<void>(`/friends/messages/${id}/read`, { method: "POST" });
export const muteUser = (userId: number) =>
  call<{ user_id: number; muted: boolean }>(`/friends/mute/${userId}`, { method: "POST" });
export const unmuteUser = (userId: number) =>
  call<{ user_id: number; muted: boolean }>(`/friends/mute/${userId}`, { method: "DELETE" });
export const getMutedUsers = () => call<number[]>("/friends/muted");

/** How a player's name is shown: their character's name, then their account name. */
export const displayName = (p: Player) => p.character?.name || p.name || "A player";
