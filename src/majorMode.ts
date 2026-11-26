// Majors on the homepage (the majors feature, startng-be app/features/majors). The homepage needs to know, before it draws
// the daily tournament banner, whether a major is running: while one is, the major takes the tournament's place and the
// daily banner steps aside. It lives here, in core, because App.tsx reads it; the majors feature's banner reads the same list,
// so /majors is asked once per page load.
import { useEffect, useState } from "react";
import { call } from "./api";
import { loadFeatures } from "./features/flags";

export type MajorSummary = {
  slug: string; title: string; tagline: string; partner: { name: string; url: string | null; logo_url: string | null };
  image_url: string | null; prizes: { place: number; prize: string }[]; starts_at: string; ends_at: string;
  state: "upcoming" | "running" | "ended"; entrants: number; games: string[];
};
export type MajorMode = { ready: boolean; majors: MajorSummary[]; running: MajorSummary | null; next: MajorSummary | null };

const EMPTY: MajorMode = { ready: false, majors: [], running: null, next: null };
let mode: MajorMode = EMPTY;
let started = false;
const listeners = new Set<(m: MajorMode) => void>();

function settle(majors: MajorSummary[]) {
  mode = { ready: true, majors, running: majors.find((m) => m.state === "running") ?? null, next: majors.find((m) => m.state !== "ended") ?? null };
  listeners.forEach((tell) => tell(mode));
}

function start() {
  if (started) return;
  started = true;
  loadFeatures()
    .then((flags) => (flags.has("*") || flags.has("majors") ? call<MajorSummary[]>(null, "/majors") : []))
    .catch(() => []) // if the API can't answer, show the normal homepage
    .then(settle);
}

/** The published majors, the one running now (if any) and the one to show (running, else the next upcoming).
 *  ready is false until the answer is in, so the homepage can hold the tournament banner back instead of flashing it. */
export function useMajorMode(): MajorMode {
  const [m, setM] = useState(mode);
  useEffect(() => {
    listeners.add(setM);
    setM(mode);
    start();
    return () => { listeners.delete(setM); };
  }, []);
  return m;
}
