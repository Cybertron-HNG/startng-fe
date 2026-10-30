// Live (Ziki #37): what's happening now, from GET /live (startng-be app/features/live). One request every 30 seconds
// serves every card and box on the page, and only while the tab is visible.
import { useEffect, useState } from "react";
import { call } from "../../api";

export type Moment = { kind: string; game: string; title: string; who: string; text: string; at: string };
export type Live = { playing: Record<string, number>; moments: Moment[]; tournament_playing: number };

const EVERY = 30_000;
let current: Live | null = null;
const listeners = new Set<(l: Live) => void>();
let timer: number | undefined;

function refresh() {
  if (document.visibilityState !== "visible") return;
  call<Live>(null, "/live").then((l) => { current = l; listeners.forEach((tell) => tell(l)); }).catch(() => {});
}

export function useLive(): Live | null {
  const [live, setLive] = useState(current);
  useEffect(() => {
    listeners.add(setLive);
    if (listeners.size === 1) { refresh(); timer = window.setInterval(refresh, EVERY); }
    return () => { listeners.delete(setLive); if (!listeners.size) window.clearInterval(timer); };
  }, []);
  return live;
}

/** "4 min ago" for a moment. */
export function ago(at: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60_000));
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : `${Math.round(min / 60)} h ago`;
}
