import { FormEvent, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { approvePendingGame, getGameSession, getPendingGame, googleLogin, listGames, login, me, myGames, PendingGameInfo, register, saveCharacter, TokenResponse, User } from "./api";
import AccountMenu from "./AccountMenu";
import Explore, { ExploreBand } from "./Explore";
import Pagination from "./Pagination";
import ScrollJump from "./ScrollJump";
import { Character, styleFor } from "./character";
// The creator (and three.js) loads only when someone opens it.
const CharacterCreator = lazy(() => import("./CharacterCreator"));
const GameBoard = lazy(() => import("./GameBoard"));
import { Game, gameReturnUrl, HANGOUT, isInAppGame, playableUrl, toCard } from "./games";

// Set when a game sent the user here to sign in: we send them back afterwards.
const returnTo = gameReturnUrl();
// Set on /approve/<code>: a game published through the API without signing in, waiting to go live.
const approveCode = location.pathname.match(/^\/approve\/([\w-]{8,40})\/?$/)?.[1] ?? null;
// Other pages (the docs) link here with ?profile or ?signin to open the profile or sign-in.
const opening = new URLSearchParams(location.search);
const openProfile = opening.has("profile");
const openSignIn = opening.has("signin");
if (openProfile || openSignIn) history.replaceState(null, "", location.pathname + location.hash);

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
export default function App({ view = "home" }: { view?: "home" | "games" | "explore" }) {
  const allGames = view === "games";
  const explore = view === "explore";
  const home = view === "home";
  const [page, setPage] = useState(pageFromUrl);
  const [query, setQuery] = useState(""); // /games: the search box
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(() => !!localStorage.getItem("token"));
  // Google sign-in; the first Google sign-in creates the account.
  const [signInOpen, setSignInOpen] = useState(!!returnTo || openSignIn);
  const [error, setError] = useState("");
  // TEMPORARY, for testing: email sign-in next to Google. Remove before the final launch.
  const [emailMode, setEmailMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  // /games: the back and forward buttons move between pages.
  useEffect(() => {
    if (!allGames) return;
    document.title = "Games · start.ng";
    const onPop = () => setPage(pageFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [allGames]);

  function goToPage(n: number) {
    history.pushState(null, "", n === 1 ? "/games" : `/games?page=${n}`);
    setPage(n);
    window.scrollTo({ top: 0 });
  }

  // The Hangout is always first; the rest come from the API.
  const community = (games ?? []).filter((g) => g.slug !== HANGOUT.slug);
  const everyGame = [HANGOUT, ...community];
  // /games has a search box: it keeps the games whose name or maker contains every word typed.
  const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const words = fold(query).split(/\s+/).filter(Boolean);
  const cards = allGames && words.length ? everyGame.filter((g) => words.every((w) => fold(g.title).includes(w) || fold(g.by).includes(w))) : everyGame;
  // What this page shows: the first HOME_GAMES on the homepage, one page of them on /games.
  const pages = Math.max(1, Math.ceil(cards.length / PER_PAGE));
  const current = Math.min(page, pages); // a page past the end shows the last one
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
    (token ? getGameSession(token, game).catch(() => null) : Promise.resolve(null)).then((s) => {
      if (s) back.hash = `startng_session=${encodeURIComponent(s.session)}&expires_in=${s.expires_in}`;
      location.replace(back.href);
    });
  }, [user, goTo]);

  function pickGame(e: React.MouseEvent, g: Game) {
    if (user || checking || isInAppGame(g)) return; // signed in: the link opens the game as usual (the Hangout asks for sign-in itself)
    e.preventDefault();
    setChosen(g);
  }

  function playAsGuest(g: Game) {
    // ?guest tells games that support it to skip their own "sign in or guest?" question.
    const url = new URL(g.url);
    url.searchParams.set("guest", "1");
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

  // TEMPORARY, for testing: remove with the email form before the final launch.
  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    try {
      onSuccess(emailMode === "register" ? await register(email, password, name || undefined) : await login(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
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
        <nav>
          <a href="/games" aria-current={allGames ? "page" : undefined}>Games</a>
          <a href="/explore" aria-current={explore ? "page" : undefined}>Explore<span className="tag">New</span></a>
          <a href={home ? "#how" : "/#how"}>How it works</a>
          <a href="/docs">Docs</a>
          {user ? (
            <AccountMenu user={user} onProfile={() => setEditing(true)} onSignOut={signOut} />
          ) : (
            <button onClick={() => setSignInOpen(true)}>Sign in</button>
          )}
        </nav>
      </header>

      <main>
        {explore && <Explore />}
        {home && (
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

        {!explore && (
        <section id="games" className={allGames ? "container all-games" : "container"}>
          <div className="section-head">
            {allGames ? <h1>All games</h1> : <h2>Games</h2>}
            {games && (
              <span className="count">
                {allGames && pages > 1
                  ? `${(current - 1) * PER_PAGE + 1}–${(current - 1) * PER_PAGE + shown.length} of ${cards.length}`
                  : `${cards.length} to play`}
              </span>
            )}
          </div>
          {games === null && <p className="empty">Loading games…</p>}
          {allGames && (
            <div className="toolbar">
              <div className="search">
                <input type="search" placeholder="Search games by name or maker" aria-label="Search games" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
                {query && <button type="button" className="clear" aria-label="Clear search" onClick={() => setQuery("")}>&#10005;</button>}
              </div>
            </div>
          )}
          {allGames && games && words.length > 0 && cards.length === 0 && <p className="empty">No games match &ldquo;{query.trim()}&rdquo;.</p>}
          {games && community.length === 0 && (
            <p className="empty">
              No community games yet. The first ones are on their way. <a href={allGames ? "/#how" : "#how"}>Put yours here.</a>
            </p>
          )}
          <div className="grid">
            {shown.map((g) => (
              <article key={g.slug} className={g.slug === HANGOUT.slug ? "game legendary" : "game"}>
                <a className="game-link" href={g.url} {...(isInAppGame(g) ? {} : { target: "_blank", rel: "noreferrer" })} onClick={(e) => pickGame(e, g)}>
                  <div className="art" style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }}>
                    {g.cover ? <img src={g.cover} alt="" loading="lazy" /> : <span>{g.title.charAt(0)}</span>}
                  </div>
                  <div className="info">
                    <h3>{g.title}</h3>
                    <p>{g.host}</p>
                    <span className="by">by {g.by}</span>
                  </div>
                </a>
                <div className="meta">
                  {g.board && <button type="button" className="link board-btn" onClick={() => setBoard(g)}>Leaderboard</button>}
                  <a className="play" href={g.url} {...(isInAppGame(g) ? {} : { target: "_blank", rel: "noreferrer" })} onClick={(e) => pickGame(e, g)}>{isInAppGame(g) ? "Play" : "Play ↗"}</a>
                </div>
              </article>
            ))}
          </div>
          {allGames ? (
            <Pagination page={current} pages={pages} onPage={goToPage} />
          ) : (
            cards.length > HOME_GAMES && (
              <div className="see-all">
                <a className="btn" href="/games">See all {cards.length} games →</a>
              </div>
            )
          )}
        </section>
        )}

        {home && <ExploreBand />}

        {home && (
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
            {/* TEMPORARY, for testing: email sign-in. Remove before the final launch. */}
            <div className="divider">or, for testing</div>
            <form className="email-form" onSubmit={submitEmail}>
              {emailMode === "register" && <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />}
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              <button type="submit">{emailMode === "register" ? "Create account" : "Sign in with email"}</button>
              <button type="button" className="link" onClick={() => { setEmailMode(emailMode === "login" ? "register" : "login"); setError(""); }}>
                {emailMode === "login" ? "No account? Register" : "Have an account? Sign in"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
