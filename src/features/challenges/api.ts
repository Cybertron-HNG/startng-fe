// Challenge links (PRD B1): API calls (startng-be app/features/challenges).
import { call, send } from "../../api";
import type { Character } from "../../character";

export type Attempt = { best: string | null; beaten: boolean; short_by: string | null };
export type Challenge = {
  code: string; game: string; game_title: string; cover_url: string | null; challenger: string; character: Character | null;
  stat: { key: string; label: string; value: number; shown: string }; expires_at: string; mine: boolean;
  attempt: Attempt | null; takers: number; beaten_by: number;
};

const token = () => localStorage.getItem("token");

export const makeChallenge = (game: string) => call<Challenge>(token(), "/challenges", send("POST", { game }));
export const getChallenge = (code: string) => call<Challenge>(token(), `/challenges/${encodeURIComponent(code)}`);
export const acceptChallenge = (code: string) => call<Challenge>(token(), `/challenges/${encodeURIComponent(code)}/accept`, send("POST"));
export const deleteChallenge = (code: string) => call<void>(token(), `/challenges/${encodeURIComponent(code)}`, send("DELETE"));
