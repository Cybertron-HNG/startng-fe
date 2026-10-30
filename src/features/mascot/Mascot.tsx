import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LIVE, store, TIPS, TOUR, titleOf, xShareUrl, type Action, type Tip } from "./guide";

// The design-only site's guide: a small character on every page (see main.tsx; only built when VITE_DESIGN_PREVIEW=1).
//
// It moves around with you: it walks after the mouse and looks at it, and on a phone it walks to where you tap or drag a finger
// (a little above it, so your finger never covers it). It reacts: click or tap and it hops and says a word; double-click or
// double-tap and it dances; leave it alone and it falls asleep.
//
// It is also a helper. Every so often it gives one short tip in a card (the tournament, new items, sharing on X, categories,
// creators), each once. It can give a tour of the home page, pointing at each part in turn. When you come back from a game it
// welcomes you back and dances, and if you won it says "Hooray!" and offers to share the win on X; then it settles in its corner
// again. It is never inside a game (the Hangout is left out). A switch beside the scroll-up button turns the guide off and on, and
// the choice is kept.
//
// The character itself never takes a click (pointer-events: none); only its card does. With "reduce motion" on, it stays in its
// corner with fixed eyes: the tips, the tour and the cheer still work, without movement. Plain CSS animation and a little
// JavaScript, no canvas.
//
// How it knows you won: the game's /connect page (on start.ng) sets localStorage "startng-guide-won" = {"game":"bingo","at":<ms>}, and the
// helper reads it when you come back. A page of start.ng's own can also ask for the cheer straight away:
// window.dispatchEvent(new CustomEvent("startng:win", { detail: { game: "Bingo" } })).

const SIZE = 52; // about as wide as the character is, in pixels
const LINES = ["Play!", "Hello!", "Sharp sharp!", "Oya, come!"];
const DANCE_LINE = "Shaku shaku!";
const SLEEP_AFTER = 20000; // quiet for this long (milliseconds) and it dozes off
const FIRST_TIP_MS = 5000; // the first tip comes this long after a page opens
const TIP_GAP_MS = 45000; // and the next one at least this long after the last
const TIP_SHOWN_MS = 15000; // a tip goes away by itself after this, unless the pointer is on it
const AWAY_MS = 15000; // away from this tab for this long and coming back counts as "welcome back"
const CARD_W = 260;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

type Card = { kind: "tip"; tip: Tip } | { kind: "win"; game?: string } | { kind: "back"; game?: string; won: boolean } | { kind: "tour"; i: number };
type Move = {
  look: (px: number, py: number) => void;
  hop: () => void;
  fit: () => void; // keeps the card inside the screen
  after: () => void; // a card was closed: the next tip comes later
};
type Stop = { text: string; el: Element };

/** The switch beside the scroll-up button, and the character when the guide is on. */
export default function Mascot() {
  const [on, setOn] = useState(store.isOn);
  const toggle = () => { store.setOn(!on); setOn(!on); };
  return (
    <>
      {on && <Character off={toggle} />}
      <button type="button" className="mascot-switch" aria-pressed={on} aria-label={on ? "Turn the guide off" : "Turn the guide on"}
        title={on ? "Guide: on (tap to turn off)" : "Guide: off (tap to turn on)"} onClick={toggle} />
    </>
  );
}

function Character({ off }: { off: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const move = useRef<Move | null>(null);
  const stops = useRef<Stop[]>([]);
  const hovering = useRef(false);
  const [card, setCard] = useState<Card | null>(null);
  const cardNow = useRef<Card | null>(null);
  cardNow.current = card;

  const close = useCallback(() => { setCard(null); move.current?.after(); }, []);

  const startTour = useCallback(() => {
    if (location.pathname !== "/") { location.assign("/?tour=1"); return; } // the tour is of the home page
    stops.current = TOUR.map((s) => ({ text: s.text, el: s.target() })).filter((s): s is Stop => !!s.el);
    if (stops.current.length) setCard({ kind: "tour", i: 0 });
  }, []);

  // The character: walking, looking, hopping, dancing, sleeping, and the tips and the cheer that open a card.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    const home = () => ({ x: innerWidth - 108, y: innerHeight - 24 }); // beside the scroll-up button
    let { x, y } = home();
    let tx = x, ty = y, raf = 0, hop = 0, talk = 0, line = 0, back = 0, boogie = 0, rest = 0, tipTimer = 0, lastTapAt = 0, lastTapX = 0, lastTapY = 0;
    const busy = () => !!cardNow.current; // while a card is open it stays by its card and does not follow

    const place = () => { el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`; };
    const fit = () => { // the card is centred on the character; slide it back if that would cut it off
      const w = Math.min(CARD_W, innerWidth - 24), left = tx - w / 2, right = tx + w / 2;
      el.style.setProperty("--shift", `${left < 8 ? 8 - left : right > innerWidth - 8 ? innerWidth - 8 - right : 0}px`);
    };
    const look = (px: number, py: number) => {
      const dx = px - x, dy = py - (y - SIZE / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 120);
      el.style.setProperty("--lx", `${((dx / d) * 3 * k).toFixed(1)}px`);
      el.style.setProperty("--ly", `${((dy / d) * 3 * k).toFixed(1)}px`);
    };
    const tick = () => {
      el.style.setProperty("--tilt", `${clamp((tx - x) / 14, -9, 9).toFixed(1)}deg`);
      x += (tx - x) * 0.1;
      y += (ty - y) * 0.1;
      place();
      if (Math.hypot(tx - x, ty - y) > 0.5) raf = requestAnimationFrame(tick);
      else { raf = 0; el.style.setProperty("--tilt", "0deg"); }
    };
    const goTo = (px: number, py: number) => {
      tx = clamp(px, SIZE, innerWidth - SIZE); ty = clamp(py, SIZE + 12, innerHeight - 10);
      if (!raf && !calm.matches) raf = requestAnimationFrame(tick);
    };
    const goHome = () => { const h = home(); goTo(h.x, h.y); fit(); };
    const backLater = () => { window.clearTimeout(back); back = window.setTimeout(() => { if (!busy()) goHome(); }, 3500); }; // a finger leaves no pointer behind
    const onUi = (e: Event) => e.target instanceof Element && !!e.target.closest(".mascot-card, .mascot-switch"); // a press on the card or the switch is not a click on the page

    const say = (text: string, ms = 1500) => {
      window.clearTimeout(talk);
      el.querySelector(".mascot-bubble")!.textContent = text;
      el.classList.add("is-talking");
      talk = window.setTimeout(() => el.classList.remove("is-talking"), ms);
    };
    // Asleep after a quiet while; any mouse move, click or touch wakes it.
    const wake = () => {
      window.clearTimeout(rest);
      el.classList.remove("is-asleep");
      rest = window.setTimeout(() => { if (!el.classList.contains("is-dancing") && !busy()) el.classList.add("is-asleep"); }, SLEEP_AFTER);
    };
    const jump = () => {
      if (calm.matches) return; // no hop or sparkles
      el.classList.remove("is-hopping", "is-sparkling");
      void el.offsetWidth; // so the animation can start again on a quick second click
      el.classList.add("is-hopping", "is-sparkling");
      window.clearTimeout(hop);
      hop = window.setTimeout(() => el.classList.remove("is-hopping", "is-sparkling"), 700);
    };
    // A double-click or double-tap, or a win: a little dance, with the words. With less motion asked for, only the words.
    const dance = (text = DANCE_LINE) => {
      wake();
      say(text, 2200);
      if (calm.matches) return;
      el.classList.remove("is-hopping", "is-sparkling", "is-dancing");
      void el.offsetWidth;
      el.classList.add("is-dancing");
      window.clearTimeout(boogie);
      boogie = window.setTimeout(() => el.classList.remove("is-dancing"), 2600);
    };
    // The hop and the word, for a click or a tap at (px, py).
    const react = (px: number, py: number) => {
      look(px, py);
      wake();
      say(LINES[line++ % LINES.length]);
      jump();
    };

    // Tips: one card at a time, each tip once, with a gap between them; held back while the tab is hidden or you are typing.
    const typing = () => { const a = document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.hasAttribute("contenteditable")); };
    const scheduleTip = (ms: number) => { window.clearTimeout(tipTimer); tipTimer = window.setTimeout(offerTip, ms); };
    function offerTip() {
      if (busy()) return; // asked again when the card closes
      if (document.hidden || typing()) return scheduleTip(8000);
      const seen = store.seen(), atHome = location.pathname === "/";
      const tip = TIPS.find((t) => !seen.includes(t.id) && (!t.home || atHome));
      if (!tip) return;
      store.markSeen(tip.id);
      goHome(); wake();
      setCard({ kind: "tip", tip });
    }

    // Mouse: walk after it, beside the pointer, never under it. Fingers: the touch handlers below.
    const onMove = (e: PointerEvent) => {
      if (calm.matches || e.pointerType === "touch" || busy()) return;
      wake();
      look(e.clientX, e.clientY);
      goTo(e.clientX + 40, e.clientY + 56);
    };
    const onLeave = () => { if (!calm.matches && !busy()) goHome(); };
    const onClick = (e: PointerEvent) => { if (e.pointerType !== "touch" && !onUi(e)) react(e.clientX, e.clientY); };
    // A double-click also selects the word under it: clear that, so the dance is not covered by a highlight (typing fields are left alone).
    const onDouble = (e: MouseEvent) => {
      if (onUi(e)) return;
      if (!(e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]"))) getSelection()?.removeAllRanges();
      dance();
    };
    // Fingers use touch events: unlike pointer events, they keep coming while the page scrolls under the finger. A short, still
    // touch is a tap (walk there and hop); a drag only makes it walk along, so scrolling never sets off a hop.
    let tapX = 0, tapY = 0, tapAt = 0;
    const onTouchStart = (e: TouchEvent) => { const t = e.touches[0]; tapX = t.clientX; tapY = t.clientY; tapAt = Date.now(); if (!onUi(e)) wake(); };
    const onTouchMove = (e: TouchEvent) => {
      if (calm.matches || busy() || onUi(e)) return;
      const t = e.touches[0];
      look(t.clientX, t.clientY);
      goTo(t.clientX, t.clientY - 72); // above the finger
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (onUi(e)) return;
      const t = e.changedTouches[0];
      if (Math.hypot(t.clientX - tapX, t.clientY - tapY) < 12 && Date.now() - tapAt < 500) {
        const second = Date.now() - lastTapAt < 380 && Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY) < 40;
        lastTapAt = second ? 0 : Date.now(); lastTapX = t.clientX; lastTapY = t.clientY;
        if (!calm.matches && !busy()) goTo(t.clientX, t.clientY - 72);
        if (second) { look(t.clientX, t.clientY); dance(); } else react(t.clientX, t.clientY);
      }
      if (!calm.matches && !busy()) backLater();
    };
    // Coming back to this tab after a while (from a game, say): welcome back, a dance, and "Hooray!" if the game said you won.
    let hiddenAt = 0;
    const comeBack = () => {
      const won = store.won(), left = store.left();
      store.clearTrip();
      if (busy()) return;
      goHome(); dance(won ? "Hooray!" : "Welcome back!");
      setCard({ kind: "back", game: (won ?? left)?.game, won: !!won });
    };
    const onVisible = () => {
      if (document.hidden) { hiddenAt = Date.now(); if (raf) { cancelAnimationFrame(raf); raf = 0; } return; }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      if (away >= AWAY_MS) comeBack();
    };
    const onShow = (e: PageTransitionEvent) => { if (e.persisted && (store.left() || store.won())) comeBack(); }; // back button from a game's page
    // Remember when a link to a game's own address (name.start.ng) is followed, so we know which game you went to.
    const onLink = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest("a") : null;
      const m = a && /^([a-z0-9-]+)\.start\.ng$/.exec(new URL(a.href, location.href).hostname);
      if (m && !["www", "api"].includes(m[1])) store.setLeft(m[1]);
    };
    // A page of start.ng's own asked for the cheer: the cheer, with the offer to share it.
    const onWin = (e: Event) => {
      const game = (e as CustomEvent<{ game?: string } | undefined>).detail?.game;
      goHome(); dance("Hooray!");
      setCard({ kind: "win", game });
    };
    const onResize = () => {
      if (calm.matches || busy()) { ({ x, y } = home()); tx = x; ty = y; }
      else { tx = clamp(tx, SIZE, innerWidth - SIZE); ty = clamp(ty, SIZE + 12, innerHeight - 10); }
      place(); fit();
    };

    move.current = { look, hop: jump, fit, after: () => scheduleTip(TIP_GAP_MS) };
    place(); fit();
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerdown", onClick, { passive: true });
    addEventListener("dblclick", onDouble);
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchmove", onTouchMove, { passive: true });
    addEventListener("touchend", onTouchEnd, { passive: true });
    addEventListener("startng:win", onWin);
    addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisible);
    addEventListener("pageshow", onShow);
    document.addEventListener("click", onLink, true);
    document.documentElement.addEventListener("mouseleave", onLeave);
    wake(); // starts the "falls asleep if left alone" timer
    scheduleTip(Math.max(FIRST_TIP_MS, TIP_GAP_MS - store.sinceLast()));
    return () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerdown", onClick);
      removeEventListener("dblclick", onDouble);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchmove", onTouchMove);
      removeEventListener("touchend", onTouchEnd);
      removeEventListener("startng:win", onWin);
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisible);
      removeEventListener("pageshow", onShow);
      document.removeEventListener("click", onLink, true);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
      for (const t of [hop, talk, back, boogie, rest, tipTimer]) window.clearTimeout(t);
      move.current = null;
    };
  }, []);

  // /?tour=1 (from another page's "Take the tour") starts the tour once the home page is up.
  useEffect(() => {
    if (location.pathname !== "/" || !/[?&]tour=1\b/.test(location.search)) return;
    history.replaceState(null, "", "/");
    const t = window.setTimeout(startTour, 800);
    return () => window.clearTimeout(t);
  }, [startTour]);

  // A tip goes away by itself after a while, unless the pointer is on it. Escape closes any card.
  useEffect(() => {
    if (!card) return;
    let t = 0;
    const later = (ms: number) => { t = window.setTimeout(() => (hovering.current ? later(4000) : close()), ms); };
    if (card.kind === "tip") later(TIP_SHOWN_MS);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", onKey);
    return () => { window.clearTimeout(t); removeEventListener("keydown", onKey); };
  }, [card, close]);

  // The tour: scroll to the part, ring it, and have the character look at it and hop.
  useEffect(() => {
    if (card?.kind !== "tour") return;
    const stop = stops.current[card.i];
    if (!stop) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tall = stop.el.getBoundingClientRect().height > innerHeight * 0.7;
    stop.el.scrollIntoView({ block: tall ? "start" : "center", behavior: calm ? "auto" : "smooth" });
    move.current?.hop();
    let raf = 0;
    const follow = () => {
      const r = stop.el.getBoundingClientRect(), box = ring.current;
      const top = Math.max(r.top, 8), bottom = Math.min(r.bottom, innerHeight - 8);
      if (box) box.style.cssText = `left:${r.left - 6}px;top:${top - 6}px;width:${r.width + 12}px;height:${Math.max(bottom - top, 24) + 12}px`;
      move.current?.look(r.left + r.width / 2, (top + bottom) / 2);
      raf = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(raf);
  }, [card]);

  useLayoutEffect(() => { move.current?.fit(); }, [card]);

  const act = (a: Action) => {
    if (a.tour) return <button key={a.label} type="button" className="btn" onClick={startTour}>{a.label}</button>;
    const href = a.share ? xShareUrl(a.share) : a.href!;
    const outside = /^https?:/.test(href);
    return <a key={a.label} className="btn" href={href} {...(outside ? { target: "_blank", rel: "noopener noreferrer" } : {})} onClick={close}>{a.label}</a>;
  };

  let text = "", actions: Action[] = [];
  if (card?.kind === "tip") { text = card.tip.text; actions = card.tip.actions; }
  if (card?.kind === "win") {
    text = card.game ? `Hooray! You won ${card.game}.` : "Hooray! You did it.";
    actions = [{ label: "Share your win", share: card.game ? `I just won ${card.game} on start.ng!` : "I just won a game on start.ng!" }];
  }
  if (card?.kind === "back") {
    const name = card.game ? titleOf(card.game) : "";
    text = card.won ? `Hooray! You won ${name}. Welcome back!` : name ? `Welcome back! How was ${name}?` : "Welcome back!";
    actions = card.won
      ? [{ label: "Share your win", share: `I just won ${name} on start.ng!` }, { label: "Play another", href: "/games" }]
      : [{ label: "Pick another game", href: "/games" }, { label: "Today's tournament", href: `${LIVE}/tournament` }];
  }
  const total = stops.current.length;

  return (
    <>
      <div ref={root} className="mascot" aria-hidden={card ? undefined : true} data-card={card?.kind}>
        <div className="mascot-bounce" aria-hidden="true">
          <div className="mascot-body">
            <span className="mascot-eye"><i className="mascot-pupil" /></span>
            <span className="mascot-eye"><i className="mascot-pupil" /></span>
            <span className="mascot-arm arm-l" /><span className="mascot-arm arm-r" />
            <span className="mascot-mouth" />
          </div>
        </div>
        <b className="mascot-bubble" aria-hidden="true" />
        <em className="mascot-note" aria-hidden="true">♪</em><em className="mascot-note" aria-hidden="true">♫</em><em className="mascot-note" aria-hidden="true">♪</em>
        <u className="mascot-zzz" aria-hidden="true">z</u>
        <i className="mascot-spark" /><i className="mascot-spark" /><i className="mascot-spark" /><i className="mascot-spark" /><i className="mascot-spark" /><i className="mascot-spark" />
        {card && (
          <div className="mascot-card" role="region" aria-label="Guide" aria-live="polite"
            onPointerEnter={() => { hovering.current = true; }} onPointerLeave={() => { hovering.current = false; }}>
            {card.kind === "tour" && <p className="mascot-card-step">Step {card.i + 1} of {total}</p>}
            <p className="mascot-card-text">{card.kind === "tour" ? stops.current[card.i]?.text : text}</p>
            <div className="mascot-card-actions">
              {card.kind === "tour" ? (
                <>
                  {card.i > 0 && <button type="button" className="ghost" onClick={() => setCard({ kind: "tour", i: card.i - 1 })}>Back</button>}
                  {card.i < total - 1
                    ? <button type="button" className="btn" onClick={() => setCard({ kind: "tour", i: card.i + 1 })}>Next</button>
                    : <button type="button" className="btn" onClick={close}>Done</button>}
                </>
              ) : (
                <>
                  {actions.map(act)}
                  <button type="button" className="ghost" onClick={close}>Not now</button>
                </>
              )}
            </div>
            <button type="button" className="link mascot-card-off" onClick={card.kind === "tour" ? close : off}>{card.kind === "tour" ? "End the tour" : "Turn the guide off"}</button>
          </div>
        )}
      </div>
      {card?.kind === "tour" && <div ref={ring} className="mascot-ring" aria-hidden="true" />}
    </>
  );
}
