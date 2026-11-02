import { useEffect, useState, useSyncExternalStore } from "react";
import { addFavorite, IndieGame, indieCoverUrl, listFavorites, listIndieGames, removeFavorite, syncFavorites, trackIndiePlay, trackPlay, User } from "./api";
import { Game, isInAppGame } from "./games";

// Favorite games. They're saved on the account (the API's /favorites) so they follow you to every
// device, and kept in localStorage too so hearts respond at once and work if the API is slow.
// A favorite is a key: "g:<slug>" for a start.ng game, "i:<id>" for a game by an independent creator.

export const gameKey = (g: Game) => `g:${g.slug}`;
export const indieKey = (g: IndieGame) => `i:${g.id}`;

const storageKey = (userId: number) => `startng:favorites:${userId}`;
const NONE: string[] = [];
const cache = new Map<number, string[]>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function read(userId: number): string[] {
  let list = cache.get(userId);
  if (!list) {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]");
      list = Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
    } catch { list = []; }
    cache.set(userId, list);
  }
  return list;
}

function write(userId: number, list: string[]) {
  cache.set(userId, list);
  try { localStorage.setItem(storageKey(userId), JSON.stringify(list)); } catch { /* private mode: kept until the page closes */ }
  notify();
}

// Another tab changed them.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key?.startsWith("startng:favorites:")) { cache.clear(); notify(); }
  });
}

const token = () => localStorage.getItem("token");
const syncedKey = (userId: number) => `startng:favorites-synced:${userId}`;
const askedThisVisit = new Set<number>();
// Hearts tapped while a request is out: an older answer from the account must not undo them.
let changes = 0;
let saving = 0;

/** Once per visit: pull the account's favorites. The first time on a device, also send up what it
 *  saved before (so nothing is lost); after that the account is the truth, so a favorite removed on
 *  another device stays removed here. */
async function loadFromAccount(userId: number) {
  if (askedThisVisit.has(userId)) return;
  askedThisVisit.add(userId);
  try {
    let first = true;
    try { first = !localStorage.getItem(syncedKey(userId)); } catch { /* treat as first */ }
    const before = changes;
    const list = first ? await syncFavorites(token(), read(userId)) : await listFavorites(token());
    try { localStorage.setItem(syncedKey(userId), "1"); } catch { /* ignore */ }
    if (changes === before && saving === 0) write(userId, list); // else a heart was tapped meanwhile; that one wins
  } catch {
    askedThisVisit.delete(userId); // offline or signed out: try again next time
  }
}

export function useFavorites(user: User | null) {
  const userId = user?.id ?? null;
  useEffect(() => { if (userId !== null) loadFromAccount(userId); }, [userId]);
  const list = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => (user ? read(user.id) : NONE),
  );
  return {
    list,
    has: (key: string) => list.includes(key),
    toggle: (key: string) => {
      if (!user) return;
      const adding = !list.includes(key);
      write(user.id, adding ? [key, ...list] : list.filter((k) => k !== key));
      // Saved on the account in the background; the heart has already changed.
      changes++;
      saving++;
      const id = user.id;
      const sentAt = changes; // the local state as of this request going out
      (adding ? addFavorite : removeFavorite)(token(), key)
        // The last answer is the account's full list, but only if no heart was tapped while this
        // request was out: a slow answer must not undo taps made after it was sent (Ziki issue #96).
        .then((saved) => { if (--saving === 0 && changes === sentAt) write(id, saved); })
        .catch(() => { saving--; });
    },
  };
}

/** The heart on a game card. Signed out, it asks you to sign in. Place it inside a `position: relative` card. */
export function FavoriteButton({ user, on, name, onToggle, onSignIn }: {
  user: User | null; on: boolean; name: string; onToggle: () => void; onSignIn: () => void;
}) {
  return (
    <button
      type="button"
      className={on ? "fav-btn on" : "fav-btn"}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
      title={user ? (on ? "Remove from favorites" : "Add to favorites") : "Sign in to save favorites"}
      onClick={user ? onToggle : onSignIn}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6.1 5c2.1 0 3.6 1.2 4.4 2.5h3C14.3 6.2 15.8 5 17.9 5c3.4 0 5.2 3.4 3.7 6.8C19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}

/** The popup opened from the account menu: everything you've hearted, in one place. */
export default function Favorites({ user, games, gamesLoading, onClose }: { user: User; games: Game[]; gamesLoading: boolean; onClose: () => void }) {
  const favs = useFavorites(user);
  const [indie, setIndie] = useState<IndieGame[] | null>(null);
  const wantsIndie = favs.list.some((k) => k.startsWith("i:"));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (wantsIndie && indie === null) listIndieGames(localStorage.getItem("token")).then(setIndie).catch(() => setIndie([]));
  }, [wantsIndie, indie]);

  const stillLoading = (favs.list.some((k) => k.startsWith("g:")) && gamesLoading) || (wantsIndie && indie === null);
  type Row = { key: string; title: string; sub: string; href: string; newTab: boolean; cover: string | null; colors: [string, string] | null; onOpen: () => void };
  const rows = favs.list.flatMap((key): Row[] => {
    if (key.startsWith("g:")) {
      const g = games.find((x) => gameKey(x) === key);
      return g ? [{ key, title: g.title, sub: `by ${g.by}`, href: g.url, newTab: !isInAppGame(g), cover: g.cover, colors: g.colors, onOpen: () => trackPlay(g.slug) }] : [];
    }
    const g = indie?.find((x) => indieKey(x) === key);
    return g ? [{ key, title: g.name, sub: `by ${g.by} · independent`, href: g.url, newTab: true, cover: indieCoverUrl(g), colors: null, onOpen: () => trackIndiePlay(g.id) }] : [];
  });

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card favorites" role="dialog" aria-modal="true" aria-labelledby="fav-title" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h3 id="fav-title">Your favorites</h3>
          <button type="button" className="link close" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        {rows.length === 0 && stillLoading ? (
          <p className="note">Loading your games…</p>
        ) : rows.length === 0 ? (
          <p className="note">Nothing here yet. Tap the heart on any game to keep it close.</p>
        ) : (
          <ul className="fav-list">
            {rows.map((r) => (
              <li key={r.key}>
                <a className="fav-item" href={r.href} {...(r.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})} onClick={r.onOpen}>
                  <span className="fav-art" style={r.colors ? { background: `linear-gradient(135deg, ${r.colors[0]}, ${r.colors[1]})` } : undefined}>
                    {r.cover ? <img src={r.cover} alt="" loading="lazy" /> : <b>{r.title.charAt(0)}</b>}
                  </span>
                  <span className="fav-text"><b>{r.title}</b><small>{r.sub}</small></span>
                </a>
                <button type="button" className="link" aria-label={`Remove ${r.title} from favorites`} onClick={() => favs.toggle(r.key)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
