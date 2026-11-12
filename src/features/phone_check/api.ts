// Phone check (Ziki #14): API calls (startng-be app/features/phone_check).
import { call } from "../../api";

export type Finding = { code: string; message: string };
export type PhoneCheck = {
  game: string; url: string; status: "unchecked" | "ok" | "worth_a_look" | "error"; method: "browser" | "files" | null;
  findings: Finding[]; checked_at: string | null;
};

const token = () => localStorage.getItem("token");

export const getPhoneCheck = (game: string) => call<PhoneCheck>(token(), `/games/${encodeURIComponent(game)}/phone-check`);
export const checkAgain = (game: string) => call<PhoneCheck>(token(), `/games/${encodeURIComponent(game)}/phone-check`, { method: "POST" });
