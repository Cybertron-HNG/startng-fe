// Player Pulse (Ziki #58): API calls (startng-be app/features/player_pulse).
import { call } from "../../api";

export type Feel = "loved" | "too_hard" | "too_easy";
export type Pulse = {
  game: string; days: number; answers: number; loved: number; too_hard: number; too_easy: number; loved_pct: number;
  notes: { feel: Feel; note: string; at: string }[];
};

const token = () => localStorage.getItem("token");

export const getPulse = (game: string) => call<Pulse>(token(), `/games/${encodeURIComponent(game)}/pulse`);
