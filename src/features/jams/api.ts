// Game jams (Ziki #35): API calls (startng-be app/features/jams).
import { call, send } from "../../api";

export type Phase = "soon" | "open" | "voting" | "over";
export type Jam = {
  slug: string; title: string; brief: string; opens_at: string; entries_close_at: string; voting_ends_at: string; phase: Phase; entries: number;
};
export type Entry = {
  game: string; title: string; url: string; cover_url: string | null; by: string;
  votes: number | null; winner: number | null; voted: boolean; can_vote: boolean; why_not: string | null;
};
export type JamPage = { jam: Jam; entries: Entry[] };
export type JamIn = { slug: string; title: string; brief: string; opens_at: string; entries_close_at: string; voting_ends_at: string };

const token = () => localStorage.getItem("token");

export const getJam = (slug: string) => call<JamPage>(token(), `/jams/${slug}`);
export const vote = (slug: string, game: string) => call<{ voted: boolean }>(token(), `/jams/${slug}/votes`, send("POST", { game }));
export const unvote = (slug: string, game: string) => call<void>(token(), `/jams/${slug}/votes/${game}`, { method: "DELETE" });
export const adminJams = () => call<Jam[]>(token(), "/admin/jams");
export const adminCreate = (body: JamIn) => call<Jam>(token(), "/admin/jams", send("POST", body));
export const adminChange = (slug: string, body: Partial<JamIn>) => call<Jam>(token(), `/admin/jams/${slug}`, send("PATCH", body));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 29 Oct 2026, in UTC: the server-written page writes dates the same way (day() in startng-be jams/server_page.py). */
export function day(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** The line under the brief, word for word what the server writes (when() in server_page.py). */
export function when(j: Jam): string {
  if (j.phase === "soon") return `Opens ${day(j.opens_at)}. Entries close ${day(j.entries_close_at)}.`;
  if (j.phase === "open") return `Taking entries until ${day(j.entries_close_at)}. Voting until ${day(j.voting_ends_at)}.`;
  if (j.phase === "voting") return `Entries are closed. Voting until ${day(j.voting_ends_at)}: players who have played an entry can vote for it.`;
  return `Finished on ${day(j.voting_ends_at)}.`;
}

/** How to enter, while the jam is coming or open (how_to_enter() in server_page.py). */
export function howToEnter(j: Jam): string | null {
  if (j.phase !== "soon" && j.phase !== "open") return null;
  return `To enter, publish your game with "jam": "${j.slug}" in its startng.json before ${day(j.entries_close_at)}.`;
}

/** "by Ada · Winner #1 · 12 votes" (entry_line() in server_page.py). */
export function entryLine(e: Entry, over: boolean): string {
  const parts = [`by ${e.by}`];
  if (e.winner) parts.push(`Winner #${e.winner}`);
  if (over && e.votes !== null) parts.push(`${e.votes} vote${e.votes === 1 ? "" : "s"}`);
  return parts.join(" · ");
}
