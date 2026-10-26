import { useEffect, useRef } from "react";

// A small character on the design preview's home screen (only built when VITE_DESIGN_PREVIEW=1, see App.tsx).
// It walks after the mouse, looks at it, and hops with a little "hello" when you click. It never takes a click
// (pointer-events: none) and stands still with fixed eyes when the visitor asks for less motion. On a phone there is no
// mouse, so it walks to where you tap or drag a finger (a little above it, so your finger never covers it), hops, and
// goes back to its corner a few seconds later. Plain CSS animation and a few lines of JavaScript, no canvas.

const SIZE = 52; // about as wide as the character is, in pixels
const LINES = ["Play!", "Hello!", "Sharp sharp!", "Oya, come!"];
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export default function Mascot() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    const home = () => ({ x: innerWidth - 108, y: innerHeight - 24 }); // beside the scroll-up button
    let { x, y } = home();
    let tx = x, ty = y, raf = 0, hop = 0, talk = 0, line = 0, back = 0;

    const place = () => { el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`; };
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
    // Where to stand: beside a mouse pointer, a little above a finger. Never under it.
    const aim = (e: PointerEvent): [number, number] => [e.clientX + 40, e.clientY + 56];
    const goHome = () => { const h = home(); goTo(h.x, h.y); };
    const backLater = () => { window.clearTimeout(back); back = window.setTimeout(goHome, 3500); }; // a finger leaves no pointer behind
    const onMove = (e: PointerEvent) => {
      if (calm.matches || e.pointerType === "touch") return; // fingers: the touch handlers below
      look(e.clientX, e.clientY);
      goTo(...aim(e));
    };
    const onLeave = () => { if (!calm.matches) goHome(); };
    // The hop and the word, for a click or a tap at (px, py).
    const react = (px: number, py: number) => {
      look(px, py);
      window.clearTimeout(talk);
      el.querySelector(".mascot-bubble")!.textContent = LINES[line++ % LINES.length];
      el.classList.add("is-talking");
      talk = window.setTimeout(() => el.classList.remove("is-talking"), 1500);
      if (calm.matches) return; // the words, but no hop or sparkles
      el.classList.remove("is-hopping", "is-sparkling");
      void el.offsetWidth; // so the animation can start again on a quick second click
      el.classList.add("is-hopping", "is-sparkling");
      window.clearTimeout(hop);
      hop = window.setTimeout(() => el.classList.remove("is-hopping", "is-sparkling"), 700);
    };
    const onClick = (e: PointerEvent) => { if (e.pointerType !== "touch") react(e.clientX, e.clientY); };
    // Fingers use touch events: unlike pointer events, they keep coming while the page scrolls under the finger. A short, still
    // touch is a tap (walk there and hop); a drag only makes it walk along, so scrolling never sets off a hop.
    let tapX = 0, tapY = 0, tapAt = 0;
    const onTouchStart = (e: TouchEvent) => { const t = e.touches[0]; tapX = t.clientX; tapY = t.clientY; tapAt = Date.now(); };
    const onTouchMove = (e: TouchEvent) => {
      if (calm.matches) return;
      const t = e.touches[0];
      look(t.clientX, t.clientY);
      goTo(t.clientX, t.clientY - 72); // above the finger
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (Math.hypot(t.clientX - tapX, t.clientY - tapY) < 12 && Date.now() - tapAt < 500) {
        if (!calm.matches) goTo(t.clientX, t.clientY - 72);
        react(t.clientX, t.clientY);
      }
      if (!calm.matches) backLater();
    };
    const onHide = () => { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } };
    const onResize = () => { if (calm.matches) { ({ x, y } = home()); tx = x; ty = y; } else { tx = clamp(tx, SIZE, innerWidth - SIZE); ty = clamp(ty, SIZE + 12, innerHeight - 10); } place(); };

    place();
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerdown", onClick, { passive: true });
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchmove", onTouchMove, { passive: true });
    addEventListener("touchend", onTouchEnd, { passive: true });
    addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onHide);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerdown", onClick);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchmove", onTouchMove);
      removeEventListener("touchend", onTouchEnd);
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onHide);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf); window.clearTimeout(hop); window.clearTimeout(talk); window.clearTimeout(back);
    };
  }, []);

  return (
    <div ref={root} className="mascot" aria-hidden="true">
      <div className="mascot-bounce">
        <div className="mascot-body">
          <span className="mascot-eye"><i className="mascot-pupil" /></span>
          <span className="mascot-eye"><i className="mascot-pupil" /></span>
          <span className="mascot-mouth" />
        </div>
      </div>
      <b className="mascot-bubble" />
      <i className="mascot-spark" /><i className="mascot-spark" /><i className="mascot-spark" /><i className="mascot-spark" /><i className="mascot-spark" /><i className="mascot-spark" />
    </div>
  );
}
