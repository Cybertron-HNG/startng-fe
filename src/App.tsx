import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { approvePendingGame, getGameSession, trackPlay, getPendingGame, googleLogin, listGames, me, myGames, PendingGameInfo, saveCharacter, TokenResponse, User } from "./api";
import AccountMenu from "./AccountMenu";
import Favorites, { FavoriteButton, gameKey, useFavorites } from "./Favorites";
import Pagination from "./Pagination";
import ThemeToggle from "./ThemeToggle";
import SearchBox, { matches, queryFromUrl, urlFor } from "./SearchBox";
import { setSeo, PAGES } from "./seo";
import { SkeletonCards } from "./Skeleton";
import ScrollJump from "./ScrollJump";
import { Character, styleFor } from "./character";
// The creator (and three.js) loads only when someone opens it.
const CharacterCreator = lazy(() => import("./CharacterCreator"));
const GameBoard = lazy(() => import("./GameBoard"));
import { Game, gameReturnUrl, HANGOUT, isInAppGame, playableUrl, toCard } from "./games";
import { CreatorsPage, CreatorsSection } from "./Creators";

// Set when a game sent the user here to sign in: we send them back afterwards.
const returnTo = gameReturnUrl();
// Set on /approve/<code>: a game published through the API without signing in, waiting to go live.
const approveCode = location.pathname.match(/^\/approve\/([\w-]{8,40})\/?$/)?.[1] ?? null;
// Other pages (the docs) link here with ?profile or ?signin to open the profile or sign-in.
const opening = new URLSearchParams(location.search);
const openProfile = opening.has("profile");
const openSignIn = opening.has("signin");
const openFavorites = opening.has("favorites");
if (openProfile || openSignIn || openFavorites) history.replaceState(null, "", location.pathname + location.hash);

// The homepage shows the first few games; /games has them all, a page at a time.
const HOME_GAMES = 8;
const PER_PAGE = 20;
const pageFromUrl = () => Math.max(1, Number.parseInt(new URLSearchParams(location.search).get("page") ?? "1", 10) || 1);

type Approval =
  | { step: "loading" }
  | { step: "missing"; message: string }
  | { step: "ready"; info: PendingGameInfo }
  | { step: "working"; info: PendingGameInfo }
  | { step: "done"; name: string; url: string }
  | { step: "failed"; info: PendingGameInfo; message: string };

/** The homepage, and /games (every game, PER_PAGE at a time). They share sign-in, the profile
 *  and the "sign in or play as a guest?" question. */
export default function App({ view = "home" }: { view?: "home" | "games" | "creators" }) {
  const allGames = view === "games";
  const creatorsPage = view === "creators";
  const [page, setPage] = useState(pageFromUrl);
  const [q, setQ] = useState(queryFromUrl); // /games search
  const [favoritesOpen, setFavoritesOpen] = useState(openFavorites);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(() => !!localStorage.getItem("token"));
  // Google sign-in; the first Google sign-in creates the account.
  const [signInOpen, setSignInOpen] = useState(!!returnTo || openSignIn);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(openProfile);
  // Published games from the API; null while loading.
  const [games, setGames] = useState<Game[] | null>(null);
  const [approval, setApproval] = useState<Approval | null>(approveCode ? { step: "loading" } : null);
  // The game whose shared leaderboard is open, if any.
  const [board, setBoard] = useState<Game | null>(null);
  // The signed-in builder's newest game, for the example address in the hero.
  const [myLatest, setMyLatest] = useState<Game | null>(null);

  // Keep the games current without a page refresh: on load, when the profile closes
  // (after an upload or a new cover), when you come back to the tab, and every 30 seconds.
  const refreshGames = useCallback(() => {
    listGames()
      .then((list) => setGames(list.map(toCard)))
      .catch(() => setGames((g) => g ?? []));
    const token = localStorage.getItem("token");
    if (user && token) myGames(token).then((mine) => setMyLatest(mine[0] ? toCard(mine[0]) : null));
    else setMyLatest(null);
  }, [user]);

  useEffect(() => {
    refreshGames();
  }, [refreshGames]);

  const profileOpen = !!user && (!user.character || editing);
  const wasOpen = useRef(profileOpen);
  useEffect(() => {
    if (wasOpen.current && !profileOpen) refreshGames();
    wasOpen.current = profileOpen;
  }, [profileOpen, refreshGames]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") refreshGames(); };
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refreshGames(); }, 30000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refreshGames]);

  // Titles and link previews for the page that's open (the served HTML has them too, see seo.ts).
  useEffect(() => {
    setSeo(approveCode ? PAGES.approve : allGames ? PAGES.games : creatorsPage ? PAGES.creators : PAGES.home);
  }, [allGames, creatorsPage]);

  // /games: the back and forward buttons move between pages and searches.
  useEffect(() => {
    if (!allGames) return;
    const onPop = () => { setPage(pageFromUrl()); setQ(queryFromUrl()); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [allGames]);

  function goToPage(n: number) {
    history.pushState(null, "", urlFor("/games", q, n));
    setPage(n);
    window.scrollTo({ top: 0 });
  }

  // Searching starts again from the first page; the address follows what you type.
  function search(next: string) {
    setQ(next);
    setPage(1);
    history.replaceState(null, "", urlFor("/games", next));
  }

  const favs = useFavorites(user);

  // The Hangout is always first; the rest come from the API (newest first). The homepage shows the
  // most played this week; ties keep the newest first.
  const community = (games ?? []).filter((g) => g.slug !== HANGOUT.slug);
  const popular = [...community].sort((a, b) => b.plays - a.plays);
  const searching = allGames && q.trim() !== "";
  // What the search box suggests: game names and their creators.
  const suggestions = useMemo(() => [HANGOUT, ...(games ?? [])].flatMap((g) => [g.title, g.by]), [games]);
  const everyCard = [HANGOUT, ...(allGames ? community : popular)];
  const cards = searching ? everyCard.filter((g) => matches(q, g.title, g.host, g.by)) : everyCard;
  // What this page shows: the first HOME_GAMES on the homepage, one page of them on /games.
  const pages = Math.max(1, Math.ceil(cards.length / PER_PAGE));
  const current = Math.min(page, pages); // a page past the end shows the last one
  // While the API answers, the Hangout (which needs no API) shows and skeleton cards hold the other places.
  const shown = allGames ? cards.slice((current - 1) * PER_PAGE, current * PER_PAGE) : cards.slice(0, HOME_GAMES);

  // A real address for the hero: your own newest game, else the newest game on start.ng.
  const example = myLatest ?? community[0] ?? null;

  // Restore the session from the saved token, so a refresh keeps you signed in.
  useEffect(() => {
    if (!checking) return;
    me(localStorage.getItem("token"))
      .then((u) => {
        if (u) setUser(u);
        else localStorage.removeItem("token");
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [checking]);

  // A game picked while signed out: ask "sign in or play as a guest?" (null = not asking).
  const [chosen, setChosen] = useState<Game | null>(null);
  // The game to go to once signed in (and the character exists): from a game's
  // ?return_to=, or a game picked here and then "Sign in".
  const [goTo, setGoTo] = useState<string | null>(returnTo);

  useEffect(() => {
    // Back to the game once signed in and the character exists.
    if (!(user?.character && goTo)) return;
    const back = new URL(goTo, location.href);
    // The Hangout lives in this app and has no game session of its own.
    if (back.origin === location.origin) {
      location.assign(back.href);
      return;
    }
    // Hand the game a game session in the address (#startng_session=...): it only works for that
    // game's player API and expires; the game never sees the sign-in token.
    const token = localStorage.getItem("token");
    const game = back.hostname.split(".")[0];
    if (goTo !== returnTo) trackPlay(game); // picked here, then signed in: they're off to play it
    (token ? getGameSession(token, game).catch(() => null) : Promise.resolve(null)).then((s) => {
      if (s) back.hash = `startng_session=${encodeURIComponent(s.session)}&expires_in=${s.expires_in}`;
      location.replace(back.href);
    });
  }, [user, goTo]);

  function pickGame(e: React.MouseEvent, g: Game) {
    if (user || checking || isInAppGame(g)) { // signed in: the link opens the game as usual (the Hangout asks for sign-in itself)
      trackPlay(g.slug);
      return;
    }
    e.preventDefault();
    setChosen(g);
  }

  function playAsGuest(g: Game) {
    // ?guest tells games that support it to skip their own "sign in or guest?" question.
    const url = new URL(g.url);
    url.searchParams.set("guest", "1");
    trackPlay(g.slug);
    window.open(url.href, "_blank", "noreferrer");
    setChosen(null);
  }

  function signInFor(g: Game) {
    setGoTo(g.url);
    setChosen(null);
    setSignInOpen(true);
  }

  function closeSignIn() {
    setSignInOpen(false);
    if (goTo !== returnTo) setGoTo(null);
  }

  function onSuccess(res: TokenResponse) {
    localStorage.setItem("token", res.access_token);
    setUser(res.user);
    setSignInOpen(false);
    setError("");
  }

  useEffect(() => {
    if (!approveCode) return;
    getPendingGame(approveCode)
      .then((info) => setApproval({ step: "ready", info }))
      .catch((err) => setApproval({ step: "missing", message: err instanceof Error ? err.message : "This link has expired or was already used" }));
  }, []);

  async function approve(info: PendingGameInfo) {
    if (!approveCode) return;
    setApproval({ step: "working", info });
    try {
      const live = await approvePendingGame(localStorage.getItem("token"), approveCode);
      setApproval({ step: "done", name: live.name, url: playableUrl(live.url) });
      refreshGames();
    } catch (err) {
      setApproval({ step: "failed", info, message: err instanceof Error ? err.message : "Could not put it live" });
    }
  }

  function closeApproval() {
    setApproval(null);
    history.replaceState(null, "", "/");
  }

  function signOut() {
    localStorage.removeItem("token");
    setUser(null);
    setEditing(false);
  }

  async function onSaveCharacter(c: Character) {
    setUser(await saveCharacter(localStorage.getItem("token"), c));
    setEditing(false);
  }

  const firstName = (user?.name ?? user?.email ?? "").split(/[ @]/)[0];

  return (
    <>
      <header className="container nav">
        <a className="logo" href="/"><b>start<span>.ng</span></b></a>
        <nav aria-label="Pages">
          <a href="/games" aria-current={allGames ? "page" : undefined}>Games</a>
          <a href="/creators" aria-current={creatorsPage ? "page" : undefined}>Creators</a>
          <a href={view === "home" ? "#how" : "/#how"}>How it works</a>
          <a href="/docs">Docs</a>
        </nav>
        <div className="nav-account">
          <ThemeToggle />
          {user ? (
            <AccountMenu user={user} onProfile={() => setEditing(true)} onFavorites={() => setFavoritesOpen(true)} onSignOut={signOut} />
          ) : (
            <button onClick={() => setSignInOpen(true)}>Sign in</button>
          )}
        </div>
      </header>

      <main>
        {creatorsPage && <CreatorsPage user={user} onSignIn={() => setSignInOpen(true)} />}

        {view === "home" && (
        <section className="container hero">
          <p className="eyebrow">Big imagination. Played everywhere.</p>
          <h1>Good vibes.<br /><mark>Good games.</mark></h1>
          <p className="lead">
            Games made by builders in the community.{" "}<br />
            {example ? (
              <>Each one lives at its own address, like <a href={example.url} target="_blank" rel="noreferrer"><code>{example.host}</code></a>.{" "}</>
            ) : (
              <>Each one lives at its own start.ng address.{" "}</>
            )}<br />
            Pick one and play right in your browser.
          </p>
          <div className="actions">
            <a className="btn" href="#games">Play now</a>
            {!user && <button className="ghost" onClick={() => setSignInOpen(true)}>Create free account</button>}
          </div>
        </section>
        )}

        {!creatorsPage && (
        <section id="games" className={allGames ? "container all-games" : "container"}>
          <div className="section-head">
            {allGames ? <h1>All games from the community</h1> : (
              <div>
                <h2>Games from the community</h2>
                {popular.some((g) => g.plays > 0) && <p className="most-played"><span className="tag">Most played</span> What everyone's playing this week</p>}
              </div>
            )}
          </div>
          {allGames && (
            <div className="list-tools">
              <SearchBox value={q} onChange={search} label="Search games" placeholder="Search games by name or creator" suggestions={suggestions} />
              {games && (
                <span className="count">
                  {searching
                    ? `${cards.length} ${cards.length === 1 ? "result" : "results"}`
                    : pages > 1
                    ? `${(current - 1) * PER_PAGE + 1}–${(current - 1) * PER_PAGE + shown.length} of ${cards.length}`
                    : `${cards.length} ${cards.length === 1 ? "game" : "games"}`}
                </span>
              )}
            </div>
          )}
          {games && !searching && community.length === 0 && (
            <p className="empty">
              No community games yet. The first ones are on their way. <a href={allGames ? "/#how" : "#how"}>Put yours here.</a>
            </p>
          )}
          {games && searching && cards.length === 0 && (
            <p className="empty">
              No games match “{q.trim()}”. <button type="button" className="link" onClick={() => search("")}>Clear search</button>
            </p>
          )}
          <div className="grid" aria-busy={games === null}>
            {shown.map((g) => (
              <article key={g.slug} className={g.slug === HANGOUT.slug ? "game legendary" : "game"}>
                <a className="game-link" href={g.url} {...(isInAppGame(g) ? {} : { target: "_blank", rel: "noreferrer" })} onClick={(e) => pickGame(e, g)}>
                  <div className="art" style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }}>
                    {g.cover ? <img src={g.cover} alt="" loading="lazy" decoding="async" /> : <span>{g.title.charAt(0)}</span>}
                  </div>
                  <div className="info">
                    <h3>{g.title}</h3>
                    <p>{g.host}</p>
                    <span className="by">by {g.by}</span>
                  </div>
                </a>
                <div className="meta">
                  <FavoriteButton user={user} on={favs.has(gameKey(g))} name={g.title} onToggle={() => favs.toggle(gameKey(g))} onSignIn={() => setSignInOpen(true)} />
                  {g.board && <button type="button" className="link board-btn" onClick={() => setBoard(g)}>Leaderboard</button>}
                  <a className="play" href={g.url} {...(isInAppGame(g) ? {} : { target: "_blank", rel: "noreferrer" })} onClick={(e) => pickGame(e, g)}>{isInAppGame(g) ? "Play" : "Play ↗"}</a>
                </div>
              </article>
            ))}
            {games === null && <SkeletonCards count={Math.max(0, (allGames ? 8 : HOME_GAMES) - shown.length)} />}
          </div>
          {allGames ? (
            <Pagination page={current} pages={pages} onPage={goToPage} hrefFor={(n) => urlFor("/games", q, n)} />
          ) : (
            cards.length > HOME_GAMES && (
              <div className="see-all">
                <a className="btn" href="/games">See all {cards.length} games →</a>
              </div>
            )
          )}
        </section>
        )}

        {view === "home" && <CreatorsSection user={user} onSignIn={() => setSignInOpen(true)} />}

        {view === "home" && (
        <section id="how" className="container how">
          <h2>Got a game? Put it on start.ng</h2>
          <ol>
            <li><b>Build it</b><span>Any static browser game: HTML, JavaScript, three.js, Phaser. Players bring their start.ng character, scores and friends.</span></li>
            <li><b>Push it to GitHub</b><span>A public repo with a ready-to-play <code>index.html</code> at the top or in <code>dist/</code>, plus a <code>cover.png</code> for its card.</span></li>
            <li><b>Publish it</b><span>One API call with your repo link, no key needed. Or hand your AI <code>start.ng/docs</code> and let it do the lot.</span></li>
            <li><b>Approve it once</b><span>Open the link you get back and it's live at <code>yourgame.start.ng</code>, with its own leaderboard if you want one. After that, every push updates it.</span></li>
          </ol>
          <div className="how-actions">
            <a className="btn" href="/docs">Read the docs</a>
            <a className="btn ghost" href="/docs.md" download="startng-docs.md">Docs for your AI (.md)</a>
          </div>
        </section>
        )}
      </main>

      <footer className="container footer">
        <span>start<span>.ng</span></span>
        <span>Built by the HNG community</span>
      </footer>
      <ScrollJump />

      {profileOpen && (
        <Suspense fallback={null}>
        <CharacterCreator
          initial={user.character ?? { name: firstName.slice(0, 24) || "Player", style: styleFor(user.id) }}
          editing={!!user.character}
          email={user.email}
          onSave={onSaveCharacter}
          onCancel={() => setEditing(false)}
        />
        </Suspense>
      )}

      {approval && !signInOpen && !checking && !(user && (!user.character || editing)) && (
        <div className="overlay">
          <div className="card approve" role="dialog" aria-modal="true" aria-labelledby="approve-title">
            {approval.step === "loading" && <p className="note">Loading…</p>}
            {approval.step === "missing" && (
              <>
                <h3 id="approve-title">This link doesn't work any more</h3>
                <p className="note">{approval.message}. Publishing the game again gives you a new link.</p>
                <button type="button" onClick={closeApproval}>Go to start.ng</button>
              </>
            )}
            {(approval.step === "ready" || approval.step === "working" || approval.step === "failed") && (
              <>
                <h3 id="approve-title">Put <mark>{approval.info.name}</mark> live?</h3>
                <p className="note">
                  From <code>{approval.info.repo_url.replace("https://github.com/", "github.com/")}</code>. It will play at{" "}
                  <code>{approval.info.name}.start.ng</code>.
                </p>
                {!approval.info.available ? (
                  <p className="error">Someone has taken "{approval.info.name}" since. Publish again with another name.</p>
                ) : !user ? (
                  <>
                    <p className="note">Sign in to put it live on your start.ng account. New here? Signing in creates your account.</p>
                    <button type="button" onClick={() => setSignInOpen(true)}>Sign in</button>
                  </>
                ) : (
                  <>
                    <p className="note">
                      It goes live on your account, <b>{user.character?.name ?? firstName}</b>. After this, publishing the same repo updates
                      the game straight away.
                    </p>
                    {approval.step === "failed" && <p className="error">{approval.message}</p>}
                    <button type="button" disabled={approval.step === "working"} onClick={() => approve(approval.info)}>
                      {approval.step === "working" ? "Putting it live…" : "Put it live"}
                    </button>
                    <button type="button" className="link" onClick={signOut}>Not you? Use another account</button>
                  </>
                )}
                <button type="button" className="link" onClick={closeApproval}>Not now</button>
              </>
            )}
            {approval.step === "done" && (
              <>
                <h3 id="approve-title"><mark>{approval.name}</mark> is live</h3>
                <p className="note">It's on your account now. Publishing the same repo again updates it straight away.</p>
                <a className="btn" href={approval.url} target="_blank" rel="noreferrer">Play it ↗</a>
                <button type="button" className="link" onClick={closeApproval}>Done</button>
              </>
            )}
          </div>
        </div>
      )}

      {favoritesOpen && user && <Favorites user={user} games={[HANGOUT, ...community]} onClose={() => setFavoritesOpen(false)} />}

      {board && (
        <Suspense fallback={null}>
          <GameBoard game={board} playerId={user?.id ?? null} onClose={() => setBoard(null)} />
        </Suspense>
      )}

      {chosen && !user && (
        <div className="overlay" onClick={() => setChosen(null)}>
          <div className="card choose" role="dialog" aria-modal="true" aria-labelledby="choose-title" onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <h3 id="choose-title">Play {chosen.title}</h3>
              <button type="button" className="link close" aria-label="Close" onClick={() => setChosen(null)}>✕</button>
            </div>
            <button type="button" className="choice" onClick={() => signInFor(chosen)}>
              <b>Sign in</b>
              <span>
                {chosen.slug === HANGOUT.slug
                  ? "The Hangout is for start.ng members: come in as your own character and meet everyone."
                  : "Save your high scores and play as your own character. You can change it any time."}
              </span>
            </button>
            {/* The Hangout needs an account: everyone in it is a real start.ng member. */}
            {chosen.slug !== HANGOUT.slug && (
              <button type="button" className="choice ghost" onClick={() => playAsGuest(chosen)}>
                <b>Play as a guest</b>
                <span>Jump straight in. Your high score won't be saved.</span>
              </button>
            )}
          </div>
        </div>
      )}

      {signInOpen && !user && !checking && (
        <div className="overlay" onClick={closeSignIn}>
          <div className="card" role="dialog" aria-modal="true" aria-labelledby="sign-in-title" onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <h3 id="sign-in-title">Sign in to start.ng</h3>
              <button type="button" className="link close" aria-label="Close" onClick={closeSignIn}>✕</button>
            </div>
            <p className="note">
              {goTo ? (new URL(goTo).origin === location.origin ? "Sign in to join the Hangout." : `Sign in to continue to ${new URL(goTo).host}.`) : "Use your Google account. New here? Signing in creates your account."}
            </p>
            {error && <p className="error">{error}</p>}
            <div className="google">
              <GoogleLogin
                onSuccess={async (c) => {
                  try { onSuccess(await googleLogin(c.credential ?? "")); }
                  catch (err) { setError(err instanceof Error ? err.message : "Google sign-in failed"); }
                }}
                onError={() => setError("Google sign-in failed")}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
