// Remix this game (Ziki #83): API calls (startng-be app/features/remix).
import { call } from "../../api";

export type GameRef = { name: string; title: string; by: string };
export type Remix = { allowed: boolean; fork_url: string | null; remix_of: GameRef | null; remixes: GameRef[]; count: number };

export const getRemix = (game: string) => call<Remix>(null, `/games/${encodeURIComponent(game)}/remix`);
