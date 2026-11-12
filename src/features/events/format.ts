// Event dates are kept in UTC and always shown in Nigeria time, like the rest of start.ng.
import { API_URL } from "../../api";
import type { SpotlightEvent } from "../../eventMode";

const TZ = "Africa/Lagos";
const part = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(d);
const clock = (iso: string) => part(new Date(iso), { hour: "numeric", minute: "2-digit", hour12: true }).replace(":00", "").replace(/\s/g, " ");

export const imageUrl = (path: string) => `${API_URL}${path}`;

/** The big day number and the short month, for the date block: "5" and "Dec". */
export const dateBlock = (iso: string) => ({ day: part(new Date(iso), { day: "numeric" }), month: part(new Date(iso), { month: "short" }) });

export const longDate = (iso: string) => part(new Date(iso), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const shortDate = (iso: string) => part(new Date(iso), { weekday: "short", day: "numeric", month: "short" });

const sameDay = (a: string, b: string) => part(new Date(a), { dateStyle: "short" }) === part(new Date(b), { dateStyle: "short" });

/** "4 pm to 11 pm" (one day), or "Fri 4 Dec, 6 pm to Sun 6 Dec, 2 pm" (more days), or just "4 pm" with no end time. */
export function timeLine(e: Pick<SpotlightEvent, "starts_at" | "ends_at">, long = false): string {
  const date = long ? longDate : shortDate;
  if (!e.ends_at) return `${date(e.starts_at)}, ${clock(e.starts_at)}`;
  if (sameDay(e.starts_at, e.ends_at)) return `${date(e.starts_at)}, ${clock(e.starts_at)} to ${clock(e.ends_at)}`;
  return `${date(e.starts_at)}, ${clock(e.starts_at)} to ${date(e.ends_at)}, ${clock(e.ends_at)}`;
}

export const whereLine = (e: Pick<SpotlightEvent, "venue" | "address">) => (e.address ? `${e.venue}, ${e.address}` : e.venue);

/** How far away it is: "In 26 days", "Tomorrow", "Today", "On now" or "Ended". */
export function countdown(e: Pick<SpotlightEvent, "starts_at" | "phase">, now = Date.now()): string {
  if (e.phase === "now") return "On now";
  if (e.phase === "past") return "Ended";
  const days = Math.round((new Date(part(new Date(e.starts_at), { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-")).getTime()
    - new Date(part(new Date(now), { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-")).getTime()) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
}
