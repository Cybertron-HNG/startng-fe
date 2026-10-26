import { useEffect, useRef } from "react";

// A small character on the design preview's home screen (only built when VITE_DESIGN_PREVIEW=1, see App.tsx).
// It walks after the mouse, looks at it, and hops with a little "hello" when you click. It never takes a click
// (pointer-events: none), stands still with fixed eyes when the visitor asks for less motion, and on a phone it
// stays in its corner and only reacts to a tap. Plain CSS animation and a few lines of JavaScript, no canvas.

const SIZE = 52; // about as wide as the character is, in pixels
const LINES = ["Play!", "Hello!", "Sharp sharp!", "Oya, come!"];
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export default function Mascot() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    const touch = matchMedia("(hover: none)");
    const home = () => ({ x: innerWidth - 108, y: innerHeight - 24 }); // beside the scroll-up button
    let { x, y } = home();
    let tx = x, ty = y, raf = 0, hop = 0, talk = 0, line = 0;

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
    const onMove = (e: PointerEvent) => {
      if (calm.matches || touch.matches || e.pointerType === "touch") return;
      look(e.clientX, e.clientY);
      goTo(e.clientX + 40, e.clientY + 56); // beside the pointer, never under it
    };
    const onLeave = () => { if (!calm.matches && !touch.matches) { const h = home(); goTo(h.x, h.y); } };
    const onClick = (e: PointerEvent) => {
      look(e.clientX, e.clientY);
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
    const onHide = () => { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } };
    const onResize = () => { if (touch.matches || calm.matches) { ({ x, y } = home()); tx = x; ty = y; } else { tx = clamp(tx, SIZE, innerWidth - SIZE); ty = clamp(ty, SIZE + 12, innerHeight - 10); } place(); };

    place();
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerdown", onClick, { passive: true });
    addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onHide);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerdown", onClick);
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onHide);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf); window.clearTimeout(hop); window.clearTimeout(talk);
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
