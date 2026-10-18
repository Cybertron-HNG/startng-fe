import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import {
  COVER_TYPES, IndieGame, indieCoverUrl, listIndieGames, MAX_COVER_BYTES, removeIndieGame, submitIndieGame, trackIndiePlay, User,
} from "./api";
import { FavoriteButton, indieKey, useFavorites } from "./Favorites";
import SearchBox, { matches, queryFromUrl, urlFor } from "./SearchBox";
import { PAGES, setSeo } from "./seo";
import { SkeletonCards } from "./Skeleton";

// Games by independent creators: made and hosted outside start.ng. The homepage shows the newest 4
// under a banner; /creators shows them all. Cards open a popup with the game's details, and Play
// opens the game's own link in a new tab.

const HOME_COUNT = 4;
const hostOf = (url: string) => { try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; } };
const token = () => localStorage.getItem("token");

/** Escape closes a popup. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

function useIndieGames(user: User | null, limit?: number, sort: "newest" | "popular" = "newest") {
  const [games, setGames] = useState<IndieGame[] | null>(null);
  const refresh = useCallback(() => {
    listIndieGames(token(), limit, sort).then(setGames).catch(() => setGames((g) => g ?? []));
  }, [limit, sort, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // On load, every 30 seconds and when you come back to the tab, so the most clicked keeps up.
  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 30000);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);
  return { games, setGames, refresh };
}

/** Opening a game counts a click, for the most clicked in the banner. */
const play = (g: IndieGame) => trackIndiePlay(g.id);

type FavProps = { user: User | null; has: (key: string) => boolean; toggle: (key: string) => void; onSignIn: () => void };

function IndieCard({ game, onOpen, fav }: { game: IndieGame; onOpen: (g: IndieGame) => void; fav: FavProps }) {
  return (
    <article className="game">
      <button type="button" className="game-link indie-open" onClick={() => { trackIndiePlay(game.id); onOpen(game); }}>
        <div className="art"><img src={indieCoverUrl(game)} alt="" loading="lazy" decoding="async" /></div>
        <div className="info">
          <h3>{game.name}</h3>
          <p>{hostOf(game.url)}</p>
          <span className="by">by {game.by}</span>
        </div>
      </button>
      <div className="meta">
        <FavoriteButton user={fav.user} on={fav.has(indieKey(game))} name={game.name} onToggle={() => fav.toggle(indieKey(game))} onSignIn={fav.onSignIn} />
        <button type="button" className="link board-btn" onClick={() => { trackIndiePlay(game.id); onOpen(game); }}>Details</button>
        <a className="play" href={game.url} target="_blank" rel="noopener noreferrer" onClick={() => play(game)}>Play ↗</a>
      </div>
    </article>
  );
}

function IndieDetails({ game, onClose, onRemoved }: { game: IndieGame; onClose: () => void; onRemoved: (id: number) => void }) {
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  useEscape(onClose);
  async function remove() {
    if (!confirm(`Remove ${game.name} from start.ng?`)) return;
    setRemoving(true);
    try {
      await removeIndieGame(token(), game.id);
      onRemoved(game.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove it");
      setRemoving(false);
    }
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card indie-details" role="dialog" aria-modal="true" aria-labelledby="indie-title" onClick={(e) => e.stopPropagation()}>
        <div className="art indie-details-art"><img src={indieCoverUrl(game)} alt={`${game.name} cover`} /></div>
        <div className="card-head">
          <h3 id="indie-title">{game.name}</h3>
          <button type="button" className="link close" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <span className="tag indie-tag">Independent creator · {game.by}</span>
        <p className="indie-description">{game.description}</p>
        <a className="indie-url" href={game.url} target="_blank" rel="noopener noreferrer" onClick={() => play(game)}><code>{game.url}</code></a>
        <p className="note">Hosted by the creator, outside start.ng. It opens in a new tab.</p>
        {error && <p className="error">{error}</p>}
        <div className="indie-actions">
          <a className="btn" href={game.url} target="_blank" rel="noopener noreferrer" onClick={() => play(game)}>Play ↗</a>
          {game.mine && <button type="button" className="link" disabled={removing} onClick={remove}>{removing ? "Removing…" : "Remove my game"}</button>}
        </div>
      </div>
    </div>
  );
}

function SubmitGame({ user, onSignIn, onClose, onAdded }: {
  user: User | null; onSignIn: () => void; onClose: () => void; onAdded: (g: IndieGame) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | null>(null); // data URL
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEscape(onClose);

  function pickCover(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!COVER_TYPES.includes(file.type)) return setError("Use a PNG, JPEG or WebP picture");
    if (file.size > MAX_COVER_BYTES) return setError("The picture must be 2 MB or less");
    setError("");
    const reader = new FileReader();
    reader.onload = () => setCover(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!cover) return setError("Add a cover picture for your card");
    setBusy(true);
    setError("");
    try {
      onAdded(await submitIndieGame(token(), { name, url, description, cover }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add your game");
      setBusy(false);
    }
  }

  return (
    <div className="overlay creator-overlay" onClick={onClose}>
      <div className="card indie-form" role="dialog" aria-modal="true" aria-labelledby="submit-title" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h3 id="submit-title">Submit your game</h3>
          <button type="button" className="link close" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        {!user ? (
          <>
            <p className="note">Sign in to add your game. New here? Signing in creates your free start.ng account.</p>
            <button type="button" onClick={onSignIn}>Sign in</button>
          </>
        ) : (
          <form onSubmit={submit} className="indie-fields">
            <p className="note">Made a game and host it yourself (itch.io, your own site, anywhere)? Show it to the start.ng community.</p>
            <label className="field">
              <span>Game name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required minLength={2} placeholder="Moon Garden" />
            </label>
            <label className="field">
              <span>Game link</span>
              <input value={url} onChange={(e) => setUrl(e.target.value)} type="url" maxLength={300} required placeholder="https://yourname.itch.io/your-game" />
            </label>
            <label className="field">
              <span>Description <em>{description.trim().length}/600</em></span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} required minLength={10} rows={4}
                placeholder="What's it about, and how do you play?" />
            </label>
            <div className="field">
              <span>Cover image</span>
              <label className={cover ? "indie-cover has" : "indie-cover"}>
                {cover ? <img src={cover} alt="Your cover" /> : <b>Upload a picture<small>PNG, JPEG or WebP · 16:10 looks best · 2 MB max</small></b>}
                <input type="file" accept={COVER_TYPES.join(",")} onChange={pickCover} />
              </label>
              {cover && <button type="button" className="link" onClick={() => setCover(null)}>Use another picture</button>}
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={busy}>{busy ? "Adding your game…" : "Add my game"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Popups shared by the homepage section and the creators page. */
function useIndiePopups(user: User | null, onSignIn: () => void, setGames: (f: (g: IndieGame[] | null) => IndieGame[] | null) => void, limit?: number) {
  const [open, setOpen] = useState<IndieGame | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const popups = (
    <>
      {open && (
        <IndieDetails game={open} onClose={() => setOpen(null)}
          onRemoved={(id) => { setGames((g) => g && g.filter((x) => x.id !== id)); setOpen(null); }} />
      )}
      {submitting && (
        <SubmitGame user={user} onSignIn={() => { setSubmitting(false); onSignIn(); }} onClose={() => setSubmitting(false)}
          onAdded={(g) => { setGames((list) => [g, ...(list ?? [])].slice(0, limit ?? Infinity)); setSubmitting(false); setOpen(g); }} />
      )}
    </>
  );
  return { setOpen, startSubmit: () => setSubmitting(true), popups };
}

/** On the homepage, under "Games from the community": the banner and the newest 4. */
export function CreatorsSection({ user, onSignIn }: { user: User | null; onSignIn: () => void }) {
  const { games, setGames } = useIndieGames(user, HOME_COUNT);
  const favs = useFavorites(user);
  const fav: FavProps = { user, has: favs.has, toggle: favs.toggle, onSignIn };
  const { games: top, refresh: refreshTop } = useIndieGames(user, 3, "popular"); // the banner: most clicked this week
  const { setOpen, startSubmit, popups } = useIndiePopups(user, onSignIn, (f) => { setGames(f); refreshTop(); }, HOME_COUNT);
  return (
    <section id="creators" className="container creators">
      <div className="indie-banner">
        <div className="indie-banner-text">
          <p className="eyebrow">Independent creators</p>
          <h2>Explore games from <mark>independent creators</mark></h2>
          <p>Games made and hosted by creators everywhere, from itch.io to their own sites. Find something new, or show the community what you've made.</p>
          <div className="indie-banner-actions">
            <a className="btn" href="/creators">Explore games</a>
            <button type="button" className="ghost" onClick={startSubmit}>Submit your game</button>
          </div>
        </div>
        <div className="indie-banner-art">
          {top && top.length > 0 ? (
            <>
              {top.map((g, i) => (
                <button key={g.id} type="button" className={`tile t${i}`} onClick={() => { trackIndiePlay(g.id); setOpen(g); }}
                  aria-label={`${g.name} by ${g.by}`}>
                  <img src={indieCoverUrl(g)} alt="" />
                  {i === 0 && <span className="tile-badge">Most clicked</span>}
                </button>
              ))}
            </>
          ) : top && (
            <button type="button" className="tile first" onClick={startSubmit}>
              <b>+</b>
              <span>Your game could be the first one here</span>
            </button>
          )}
        </div>
      </div>
      {(games === null || games.length > 0) && (
        <>
          <div className="section-head creators-head">
            <h3>New from independent creators</h3>
            <a className="count" href="/creators">See all →</a>
          </div>
          <div className="grid" aria-busy={games === null}>
            {games === null ? <SkeletonCards count={HOME_COUNT} /> : games.map((g) => <IndieCard key={g.id} game={g} onOpen={setOpen} fav={fav} />)}
          </div>
        </>
      )}
      {popups}
    </section>
  );
}

/** /creators: every game by independent creators, with a search. */
export function CreatorsPage({ user, onSignIn }: { user: User | null; onSignIn: () => void }) {
  const { games, setGames } = useIndieGames(user);
  const { setOpen, startSubmit, popups } = useIndiePopups(user, onSignIn, setGames);
  const favs = useFavorites(user);
  const fav: FavProps = { user, has: favs.has, toggle: favs.toggle, onSignIn };
  const [q, setQ] = useState(queryFromUrl);
  useEffect(() => {
    setSeo(PAGES.creators);
    const onPop = () => setQ(queryFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  function search(next: string) {
    setQ(next);
    history.replaceState(null, "", urlFor("/creators", next));
  }
  const searching = q.trim() !== "";
  const found = (games ?? []).filter((g) => matches(q, g.name, g.by, g.description, hostOf(g.url)));
  return (
    <section className="container all-games creators-page">
      <div className="section-head">
        <h1>Games by independent creators</h1>
      </div>
      <div className="creators-intro">
        <p>Made and hosted by creators outside start.ng. Tap a card to read about a game, or play it on the creator's own site.</p>
        <button type="button" onClick={startSubmit}>Submit your game</button>
      </div>
      <div className="list-tools">
        <SearchBox value={q} onChange={search} label="Search independent games" placeholder="Search games or creators"
          suggestions={(games ?? []).flatMap((g) => [g.name, g.by])} />
        {games && <span className="count">{searching ? `${found.length} ${found.length === 1 ? "result" : "results"}` : `${games.length} ${games.length === 1 ? "game" : "games"}`}</span>}
      </div>
      {games && games.length === 0 && (
        <p className="empty">No games from independent creators yet. <button type="button" className="link" onClick={startSubmit}>Be the first to add yours.</button></p>
      )}
      {games && games.length > 0 && searching && found.length === 0 && (
        <p className="empty">No games match “{q.trim()}”. <button type="button" className="link" onClick={() => search("")}>Clear search</button></p>
      )}
      <div className="grid" aria-busy={games === null}>
        {games === null ? <SkeletonCards count={8} /> : found.map((g) => <IndieCard key={g.id} game={g} onOpen={setOpen} fav={fav} />)}
      </div>
      {popups}
    </section>
  );
}
