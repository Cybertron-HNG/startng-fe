import { FormEvent, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { getGameSession, googleLogin, listGames, login, me, myGames, register, saveCharacter, TokenResponse, User } from "./api";
import { AvatarFace } from "./Avatar";
import { Character, styleFor } from "./character";
// The creator (and three.js) loads only when someone opens it.
const CharacterCreator = lazy(() => import("./CharacterCreator"));
const GameBoard = lazy(() => import("./GameBoard"));
import { Game, gameReturnUrl, HANGOUT, isInAppGame, toCard } from "./games";

// Set when a game sent the user here to sign in: we send them back afterwards.
const returnTo = gameReturnUrl();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(() => !!localStorage.getItem("token"));
  // Google sign-in; the first Google sign-in creates the account.
  const [signInOpen, setSignInOpen] = useState(!!returnTo);
  const [error, setError] = useState("");
  // TEMPORARY, for testing: email sign-in next to Google. Remove before the final launch.
  const [emailMode, setEmailMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Published games from the API; null while loading.
  const [games, setGames] = useState<Game[] | null>(null);
  // True when the games couldn't be loaded and there's no earlier list to keep showing.
  const [gamesFailed, setGamesFailed] = useState(false);
  // The game whose shared leaderboard is open, if any.
  const [board, setBoard] = useState<Game | null>(null);
  // The signed-in builder's newest game, for the example address in the hero.
  const [myLatest, setMyLatest] = useState<Game | null>(null);

  // Keep the games current without a page refresh: on load, when the profile closes
  // (after an upload or a new cover), when you come back to the tab, and every 30 seconds.
  const refreshGames = useCallback(() => {
    listGames()
      .then((list) => {
        setGames(list.map(toCard));
        setGamesFailed(false);
      })
      .catch(() => setGamesFailed(true)); // a list we already have stays on screen; the next refresh tries again
    const token = localStorage.getItem("token");
    if (user && token) myGames(token).then((mine) => setMyLatest(mine[0] ? toCard(mine[0]) : null)).catch(() => {});
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

  // The Hangout is always first; the rest come from the API.
  const community = (games ?? []).filter((g) => g.slug !== HANGOUT.slug);
  const cards = [HANGOUT, ...community];

  // A real address for the hero: your own newest game, else the newest game on start.ng.
  const example = myLatest ?? community[0] ?? null;

  // Close the profile menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

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

  function signOut() {
    localStorage.removeItem("token");
    setUser(null);
    setEditing(false);
    setMenuOpen(false);
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
          <a href="#games">Games</a>
          <a href="#how">How it works</a>
          {user ? (
            <div className="me" ref={menuRef}>
              <button className="me-button" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Your account">
                <AvatarFace style={user.character?.style ?? styleFor(user.id)} size={40} />
              </button>
              {menuOpen && (
                <div className="menu" role="menu">
                  <div className="menu-head">
                    <AvatarFace style={user.character?.style ?? styleFor(user.id)} size={44} />
                    <div>
                      <strong>{user.character?.name ?? firstName}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                  <button role="menuitem" onClick={() => { setEditing(true); setMenuOpen(false); }}>View profile</button>
                  <button role="menuitem" onClick={signOut}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setSignInOpen(true)}>Sign in</button>
          )}
        </nav>
      </header>

      <main>
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

        <section id="games" className="container">
          <div className="section-head">
            <h2>Games</h2>
            {games && <span className="count">{cards.length} to play</span>}
          </div>
          {games === null && !gamesFailed && <p className="empty">Loading games…</p>}
          {games === null && gamesFailed && (
            <p className="empty">
              Couldn't load games. <button type="button" className="link retry" onClick={refreshGames}>Try again</button>
            </p>
          )}
          {games && community.length === 0 && (
            <p className="empty">
              No community games yet. The first ones are on their way. <a href="#how">Put yours here.</a>
            </p>
          )}
          <div className="grid">
            {cards.map((g) => (
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
        </section>

        <section id="how" className="container how">
          <h2>Got a game? Put it on start.ng</h2>
          <ol>
            <li><b>Build it</b><span>Any browser game works: HTML, JavaScript, three.js, anything static.</span></li>
            <li><b>Upload it</b><span>Put your built files in a folder named after your game, with index.html at the top.</span></li>
            <li><b>It's live</b><span>Your game appears at <code>yourgame.start.ng</code> for everyone to play.</span></li>
          </ol>
        </section>
      </main>

      <footer className="container footer">
        <span>start<span>.ng</span></span>
        <span>Built by the HNG community</span>
      </footer>

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
              <span>Save your high scores and play as your own character. You can change it any time.</span>
            </button>
            <button type="button" className="choice ghost" onClick={() => playAsGuest(chosen)}>
              <b>Play as a guest</b>
              <span>Jump straight in. Your high score won't be saved.</span>
            </button>
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
