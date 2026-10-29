// Tip a creator (Ziki #82): API calls (startng-be app/features/tips).
import { call, send } from "../../api";

export type TipBoxInfo = { supporters: number; amounts: number[]; can_tip: boolean | null; reason: string | null; coins: number | null };
export type TipSent = { balance: number; supporters: number };
export type Received = { count: number; coins: number; tips: { by: string; amount: number; note: string | null; at: string }[] };

const token = () => localStorage.getItem("token");

export const getTipBox = (game: string) => call<TipBoxInfo>(token(), `/games/${encodeURIComponent(game)}/tips`);
export const sendTip = (game: string, amount: number, note: string) =>
  call<TipSent>(token(), `/games/${encodeURIComponent(game)}/tips`, send("POST", { amount, note: note.trim() || null }));
export const getReceived = (game: string) => call<Received>(token(), `/games/${encodeURIComponent(game)}/tips/received`);
