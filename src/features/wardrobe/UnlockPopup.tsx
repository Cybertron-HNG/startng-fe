import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "../../api";
import { styleFor } from "../../character";
import { changed, getItems, getWardrobe, wear, type Item } from "./api";
import { dressed, useWorn, withItem } from "./dress";
import { useDialog } from "./useDialog";
import "./wardrobe.css";
import { picture, share } from "./words";
import { withHandle } from "../../share";
import { celebrate } from "../../motion/motion";

const Viewer = lazy(() => import("../../three/Viewer"));

const seenKey = (userId: number) => `wardrobe-seen:${userId}`;

function readSeen(userId: number): Set<string> | null {
  try {
    const raw = localStorage.getItem(seenKey(userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}
function writeSeen(userId: number, seen: Set<string>) {
  try { localStorage.setItem(seenKey(userId), JSON.stringify([...seen])); } catch { /* private window: we'll ask again */ }
}

/** "You unlocked the Silver Crown! Wear it?" Items are earned inside games, so start.ng checks for new ones when you
 *  come back to the tab and every minute while it's open. The first check only remembers what you have, so nobody
 *  gets a popup for every old item. Bought items never pop up (the shop says "wardrobe:seen"). */
export default function UnlockPopup({ user }: { user: User }) {
  const [queue, setQueue] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [worn, setWorn] = useState(false);
  const [error, setError] = useState("");
  const catalog = useRef<Map<string, Item> | null>(null);
  const wearing = useWorn(user.id);

  useEffect(() => {
    let live = true;
    const check = async () => {
      try {
        catalog.current ??= new Map((await getItems()).map((i) => [i.key, i]));
        const owned = (await getWardrobe()).owned.map((o) => o.key);
        const seen = readSeen(user.id);
        if (seen === null) { writeSeen(user.id, new Set(owned)); return; }
        const fresh = owned.filter((k) => !seen.has(k)).map((k) => catalog.current!.get(k)).filter((i): i is Item => !!i);
        if (live && fresh.length) {
          fresh.forEach((i) => seen.add(i.key));
          writeSeen(user.id, seen);
          setQueue((q) => [...q, ...fresh.filter((i) => !q.some((x) => x.key === i.key))]);
        }
      } catch { /* offline or signed out: try again later */ }
    };
    const onSeen = (e: Event) => {
      const seen = readSeen(user.id) ?? new Set<string>();
      seen.add((e as CustomEvent<string>).detail);
      writeSeen(user.id, seen);
    };
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    check();
    const timer = window.setInterval(onVisible, 60000);
    window.addEventListener("focus", check);
    window.addEventListener("wardrobe:seen", onSeen);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("wardrobe:seen", onSeen);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user.id]);

  const item = queue[0];
  useEffect(() => { if (item) celebrate(); }, [item?.key]); // confetti when something is unlocked (prototype, branch proto/motion)
  useEffect(() => { setWorn(false); setError(""); }, [item?.key]);
  // The character wearing the new item, on top of what they already wear.
  const look = useMemo(() => item ? dressed(user.character?.style ?? styleFor(user.id), withItem(wearing ?? [], item.key, item.slot)) : null,
    [item, wearing, user]);
  const next = () => setQueue((q) => q.slice(1));
  const dialogRef = useDialog(!!item && !!look, next);
  if (!item || !look) return null;

  async function wearIt() {
    setBusy(true);
    setError("");
    try {
      await wear(item.key);
      setWorn(true);
      changed();
    } catch (err) {
      // A dropped connection says "Failed to fetch" (a TypeError); the API's own refusals say what went wrong.
      setError(err instanceof Error && !(err instanceof TypeError) ? err.message : "Couldn't put it on. Try again from your wardrobe.");
    } finally {
      setBusy(false);
    }
  }

  const text = `I unlocked the ${item.name} (${item.rarity}) on start.ng! ${picture(item.key, item.slot)}`;
  const shareUrl = `https://twitter.com/intent/tweet?${new URLSearchParams({ text: withHandle(text), url: location.origin })}`;

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) next(); }}>
      <div ref={dialogRef} tabIndex={-1} className={`card wd-unlock r-${item.rarity}`} role="dialog" aria-modal="true" aria-labelledby="wd-unlock-title">
        <p className="eyebrow">Unlocked</p>
        <div className="wd-unlock-art">
          <Suspense fallback={<span className="wd-unlock-pic" aria-hidden="true">{picture(item.key, item.slot)}</span>}>
            <Viewer style={look} className="wd-viewer" />
          </Suspense>
        </div>
        <h3 id="wd-unlock-title">You unlocked the {item.name}!</h3>
        <p><span className={`wd-rarity r-${item.rarity}`}>{item.rarity}</span> <span className="note">{item.how} · {share(item.owned_share)}</span></p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="creator-actions">
          {worn ? (
            <a className="btn" href="/wardrobe">See your wardrobe</a>
          ) : (
            <button type="button" disabled={busy} onClick={wearIt}>{busy ? "…" : "Wear it"}</button>
          )}
          <a className="btn ghost" href={shareUrl} target="_blank" rel="noopener noreferrer">Share on X</a>
          <button type="button" className="ghost" onClick={next}>{queue.length > 1 ? `Next (${queue.length - 1} more)` : "Later"}</button>
        </div>
      </div>
    </div>
  );
}
