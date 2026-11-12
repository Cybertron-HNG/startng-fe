/** "2d 5h", "5h 12m" or "9m": how long until `iso` (or "" once it has passed). */
export function until(iso: string, now = Date.now()): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${Math.max(m, 1)}m`;
}

export const dayTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const dayOnly = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** What the status tag says for a major's dates. */
export function statusText(m: { state: string; starts_at: string; ends_at: string }): string {
  if (m.state === "ended") return "Ended";
  return m.state === "upcoming" ? `Starts in ${until(m.starts_at)}` : `${until(m.ends_at)} left`;
}
