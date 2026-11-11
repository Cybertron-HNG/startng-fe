import IndieCategoryPicker from "./features/tags/IndieCategoryPicker";
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import {
  COVER_TYPES, IndieGame, indieCoverUrl, listIndieGames, MAX_COVER_BYTES, submitIndieGame, User,
} from "./api";
import { FavoriteButton, indieKey, useFavorites } from "./Favorites";
import Pagination from "./Pagination";
import SearchBox, { matches, queryFromUrl, urlFor } from "./SearchBox";
import { hostOf, indiePath } from "./indie";
import { PAGES, setSeo } from "./seo";
import { withHandle } from "./share";
import { analytics } from "./analytics";
import { NotFoundSection } from "./NotFound";
import { SkeletonCards } from "./Skeleton";
import { useDialog } from "./useDialog";

// Games by independent creators: made and hosted outside start.ng. The homepage shows the newest 4
// under a banner; /creators shows them all. Cards open the game's own page on start.ng
// (start.ng/creators/<id>-<name>, see IndiePage.tsx), and Play there opens the game's own link in a new tab.

const HOME_COUNT = 4;
const PER_PAGE = 20; // the same page size as /games
const pageFromUrl = () => Math.max(1, Number.parseInt(new URLSearchParams(location.search).get("page") ?? "1", 10) || 1);
const token = () => localStorage.getItem("token");

function useIndieGames(user: User | null, limit?: number, sort: "newest" | "popular" = "newest") {
  const [games, setGames] = useState<IndieGame[] | null>(null);
  const [loaded, setLoaded] = useState(false); // the API has answered at least once (games is [] after a failure too)
  const refresh = useCallback(() => {
    listIndieGames(token(), limit, sort).then((g) => { setGames(g); setLoaded(true); }).catch(() => setGames((g) => g ?? []));
  }, [limit, sort, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // On load, every 30 seconds and when you come back to the tab, so the most clicked keeps up.
  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 30000);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);
  return { games, setGames, refresh, loaded };
}

type FavProps = { user: User | null; has: (key: string) => boolean; toggle: (key: string) => void; onSignIn: () => void };

function IndieCard({ game, fav }: { game: IndieGame; fav: FavProps }) {
  return (
    <article className="game">
      <a className="game-link indie-open" href={indiePath(game)}>
        <div className="art"><img src={indieCoverUrl(game)} alt="" loading="lazy" decoding="async" /></div>
        <div className="info">
          <h3>{game.name}</h3>
          <p>{hostOf(game.url)}</p>
          <span className="by">by {game.by}</span>
        </div>
      </a>
      <div className="meta">
        <FavoriteButton user={fav.user} on={fav.has(indieKey(game))} name={game.name} onToggle={() => fav.toggle(indieKey(game))} onSignIn={fav.onSignIn} />
        <a className="play" href={indiePath(game)}>View</a>
      </div>
    </article>
  );
}

function SubmitGame({ user, onSignIn, onClose, onAdded }: {
  user: User | null; onSignIn: () => void; onClose: () => void; onAdded: (g: IndieGame) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | null>(null); // data URL
  const [categories, setCategories] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<IndieGame | null>(null);
  const close = () => (added ? onAdded(added) : onClose());
  const dialog = useDialog(true, close);

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
      setAdded(await submitIndieGame(token(), { name, url, description, cover, categories, other_category: other.trim() || undefined }));
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add your game");
      setBusy(false);
    }
  }

  // Once the game is added: a welcome, and an invitation (not a requirement) to share it on X. The post
  // links the creators page and mentions start.ng's account. Closing it opens the game's own page.
  const post = added && withHandle(`I just put my game ${added.name} on start.ng. Find it and more games by independent creators at ${location.origin}/creators`);
  function share() {
    if (!added || !post) return;
    window.open(`https://twitter.com/intent/tweet?${new URLSearchParams({ text: post })}`, "_blank", "noopener,noreferrer");
    analytics.share("indie_game", String(added.id), "x");
  }

  return (
    <div className="overlay creator-overlay" onClick={close}>
      <div ref={dialog} tabIndex={-1} className="card indie-form" role="dialog" aria-modal="true" aria-labelledby="submit-title" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h3 id="submit-title">{added ? "Welcome to start.ng" : "Submit your game"}</h3>
          <button type="button" className="link close" aria-label="Close" onClick={close}>✕</button>
        </div>
        {added ? (
          <div className="indie-fields">
            <p className="note"><b>{added.name}</b> is now on start.ng, with its own page for players to find it.</p>
            <p className="indie-share-note">Want more players? Sharing your game on X helps more people find it. We wrote the post for you:</p>
            <p className="indie-post">{post}</p>
            <button type="button" onClick={share}>Share on X</button>
            <button type="button" className="ghost" onClick={close}>See my game</button>
          </div>
        ) : !user ? (
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
            <IndieCategoryPicker picked={categories} other={other} onPick={setCategories} onOther={setOther} />
            <button type="submit" disabled={busy}>{busy ? "Adding your game…" : "Add my game"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

/** The "Submit your game" popup, shared by the homepage section and the creators page. Once a game is added it
 *  welcomes the creator (with an optional share on X), and closing it opens the game's own page. */
function useSubmitPopup(user: User | null, onSignIn: () => void) {
  const [submitting, setSubmitting] = useState(false);
  const popups = submitting && (
    <SubmitGame user={user} onSignIn={() => { setSubmitting(false); onSignIn(); }} onClose={() => setSubmitting(false)}
      onAdded={(g) => { setSubmitting(false); location.assign(indiePath(g)); }} />
  );
  return { startSubmit: () => setSubmitting(true), popups };
}

/** On the homepage, under "Games from the community": the banner and the newest 4. */
export function CreatorsSection({ user, onSignIn }: { user: User | null; onSignIn: () => void }) {
  const { games } = useIndieGames(user, HOME_COUNT);
  const favs = useFavorites(user);
  const fav: FavProps = { user, has: favs.has, toggle: favs.toggle, onSignIn };
  const { games: top } = useIndieGames(user, 3, "popular"); // the banner: most clicked this week
  const { startSubmit, popups } = useSubmitPopup(user, onSignIn);
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
                <a key={g.id} className={`tile t${i}`} href={indiePath(g)} aria-label={`${g.name} by ${g.by}`}>
                  <img src={indieCoverUrl(g)} alt="" />
                  {i === 0 && <span className="tile-badge">Most clicked</span>}
                </a>
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
          <div className="grid creators-new" aria-busy={games === null}>
            {games === null ? <SkeletonCards count={HOME_COUNT} /> : games.map((g) => <IndieCard key={g.id} game={g} fav={fav} />)}
          </div>
        </>
      )}
      {popups}
    </section>
  );
}

/** /creators: every game by independent creators, PER_PAGE at a time, with a search. */
export function CreatorsPage({ user, onSignIn }: { user: User | null; onSignIn: () => void }) {
  const { games, loaded } = useIndieGames(user);
  const { startSubmit, popups } = useSubmitPopup(user, onSignIn);
  const favs = useFavorites(user);
  const fav: FavProps = { user, has: favs.has, toggle: favs.toggle, onSignIn };
  const [q, setQ] = useState(queryFromUrl);
  const [page, setPage] = useState(pageFromUrl);
  useEffect(() => {
    const onPop = () => { setPage(pageFromUrl()); setQ(queryFromUrl()); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  function goToPage(n: number) {
    history.pushState(null, "", urlFor("/creators", q, n));
    setPage(n);
    window.scrollTo({ top: 0 });
  }
  // Searching starts again from the first page; the address follows what you type.
  function search(next: string) {
    setQ(next);
    setPage(1);
    history.replaceState(null, "", urlFor("/creators", next));
  }
  const searching = q.trim() !== "";
  const found = (games ?? []).filter((g) => matches(q, g.name, g.by, g.description, hostOf(g.url)));
  const pages = Math.max(1, Math.ceil(found.length / PER_PAGE));
  const current = Math.min(page, pages); // a page past the end shows the last one
  const shown = found.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  // /creators?page= past the last page is "Page not found", as nginx serves it (a 404); a search shows its last page.
  // Only once the API has answered: if it can't, the page stays as it is.
  const pastEnd = loaded && !searching && page > pages;
  // The same tags nginx serves: each page is its own address, searches are noindex.
  useEffect(() => {
    if (pastEnd) return; // NotFoundSection sets its own
    setSeo({ ...PAGES.creators, path: page > 1 ? `${PAGES.creators.path}?page=${page}` : PAGES.creators.path, noindex: searching });
  }, [pastEnd, page, searching]);
  if (pastEnd) return <NotFoundSection />;
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
        {games && (
          <span className="count">
            {searching
              ? `${found.length} ${found.length === 1 ? "result" : "results"}`
              : pages > 1
              ? `${(current - 1) * PER_PAGE + 1}–${(current - 1) * PER_PAGE + shown.length} of ${games.length}`
              : `${games.length} ${games.length === 1 ? "game" : "games"}`}
          </span>
        )}
      </div>
      {games && games.length === 0 && (
        <p className="empty">No games from independent creators yet. <button type="button" className="link" onClick={startSubmit}>Be the first to add yours.</button></p>
      )}
      {games && games.length > 0 && searching && found.length === 0 && (
        <p className="empty">No games match “{q.trim()}”. <button type="button" className="link" onClick={() => search("")}>Clear search</button></p>
      )}
      <div className="grid" aria-busy={games === null}>
        {games === null ? <SkeletonCards count={8} /> : shown.map((g) => <IndieCard key={g.id} game={g} fav={fav} />)}
      </div>
      <Pagination page={current} pages={pages} onPage={goToPage} hrefFor={(n) => urlFor("/creators", q, n)} />
      {popups}
    </section>
  );
}
