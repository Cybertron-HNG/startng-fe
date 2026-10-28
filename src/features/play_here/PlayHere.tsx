import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { trackPlay } from "../../api";
import { isGameOrigin, playableUrl } from "../../games";
import type { PagePartProps } from "../registry";

// Whether the game is open on the page lives in the address (?play=here), so a shared or server-written link opens it,
// and Back closes it. pushState doesn't tell anyone, so the button and the frame listen here as well as to popstate.
const listeners = new Set<() => void>();
const isOpen = () => new URLSearchParams(location.search).get("play") === "here";
function subscribe(tell: () => void) {
  listeners.add(tell);
  window.addEventListener("popstate", tell);
  return () => { listeners.delete(tell); window.removeEventListener("popstate", tell); };
}
const useOpen = () => useSyncExternalStore(subscribe, isOpen);

function setOpen(open: boolean) {
  if (open === isOpen()) return;
  if (!open && history.state?.playHere) return history.back(); // opened here: Back is the same as closing
  const url = new URL(location.href);
  if (open) url.searchParams.set("play", "here");
  else url.searchParams.delete("play");
  if (open) history.pushState({ ...history.state, playHere: true }, "", url);
  else history.replaceState(history.state, "", url);
  listeners.forEach((tell) => tell());
}

/** Next to Play on a game's page. The same words and address as the server-written page (startng-be play_here). */
export function PlayHereButton({ game, games }: PagePartProps) {
  const open = useOpen();
  if (!game || !games?.length || open) return null;
  return (
    <a className="btn ghost" href={`/games/${game}?play=here`} onClick={(e) => { e.preventDefault(); trackPlay(game); setOpen(true); }}>
      Play here
    </a>
  );
}

/** The game itself, in a frame under the game's details. */
export function PlayHereFrame({ user, onSignIn, games }: PagePartProps) {
  const open = useOpen();
  const g = games?.[0];
  const box = useRef<HTMLElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [round, setRound] = useState(0); // a new round reloads the game
  const askedToSignIn = useRef(false);

  // The game's Kit asks the page to sign in (public/kit.js), so start.ng's sign-in opens here instead of inside the frame.
  useEffect(() => {
    if (!open) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !isGameOrigin(e.origin)) return;
      if (e.data?.type === "startng:signIn") { askedToSignIn.current = true; onSignIn(); }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, onSignIn]);

  // Signed in for the game: load it again, so it starts as the player's own character.
  useEffect(() => {
    if (user && askedToSignIn.current) { askedToSignIn.current = false; setRound((r) => r + 1); }
  }, [user]);

  useEffect(() => {
    if (open) box.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open]);

  if (!open || !g) return null;
  const src = playableUrl(g.url);
  return (
    <section className="play-here" ref={box} aria-label={`${g.title}, playing on this page`}>
      <div className="play-here-bar">
        <span>Playing here</span>
        {document.fullscreenEnabled && (
          <button type="button" className="ghost" onClick={() => void frame.current?.requestFullscreen().catch(() => {})}>Full screen</button>
        )}
        {/* Closes the frame too, so the game doesn't run twice. */}
        <a className="btn ghost" href={src} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>Open in new tab ↗</a>
        <button type="button" className="ghost play-here-close" onClick={() => setOpen(false)}>Close</button>
      </div>
      <iframe key={round} ref={frame} src={src} title={g.title} allow="autoplay; fullscreen; gamepad; clipboard-write" allowFullScreen />
    </section>
  );
}
