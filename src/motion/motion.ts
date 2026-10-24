// PROTOTYPE of start.ng's motion (branch proto/motion). Small, no libraries, plain CSS plus a little code:
//   reveal  sections and cards rise into view as you scroll to them (only the ones below the fold, so nothing flashes)
//   tilt    game cards lean towards the pointer and glow where it is (mouse only)
//   confetti, countUp   the celebration moments
// Everything is off for people who ask their device for less motion, and the page is complete without it: the effects only
// add classes after the page has loaded, so a search engine or a slow phone still gets all the content.

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const REVEAL = ".tournament-banner, .gotw, .shelf, .game, .rating-box, .an-card";

function initReveal() {
  const seen = new WeakSet<Element>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.remove("mo-hide");
      e.target.classList.add("mo-in");
      io.unobserve(e.target);
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  const scan = () => {
    document.querySelectorAll(REVEAL).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (el.getBoundingClientRect().top < innerHeight * 0.95) return; // already on screen: leave it alone
      const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(REVEAL)) : [];
      (el as HTMLElement).style.setProperty("--mo-d", `${Math.min(siblings.indexOf(el), 5) * 70}ms`);
      el.classList.add("mo-hide");
      io.observe(el);
    });
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; scan(); }); };
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  scan();
}

function initTilt() {
  let current: HTMLElement | null = null;
  const reset = (el: HTMLElement | null) => { el?.style.removeProperty("--tx"); el?.style.removeProperty("--ty"); };
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const card = (e.target as Element | null)?.closest?.<HTMLElement>(".game");
    if (card !== current) { reset(current); current = card ?? null; }
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    card.style.setProperty("--tx", String((x - 0.5) * 2));
    card.style.setProperty("--ty", String((y - 0.5) * 2));
    card.style.setProperty("--px", String(x));
    card.style.setProperty("--py", String(y));
  }, { passive: true });
  document.addEventListener("pointerleave", () => { reset(current); current = null; });
}

/** Turn the motion on (call once, after the page is up). */
export function startMotion() {
  if (reducedMotion()) return;
  document.documentElement.classList.add("mo");
  initReveal();
  initTilt();
}

/** Counts a number up to its value, like a score or a rank arriving. */
export function countUp(el: HTMLElement, to: number, ms = 1100, from = 0) {
  if (reducedMotion()) { el.textContent = String(to); return; }
  const t0 = performance.now();
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** A burst of confetti from a point (default: the upper middle of the screen), in the site's own colours. */
export function celebrate(origin?: { x: number; y: number }, count = 150) {
  if (reducedMotion()) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "100000" });
  document.body.append(canvas);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); return; }
  ctx.scale(dpr, dpr);

  const css = getComputedStyle(document.documentElement);
  const colors = ["--lime", "--ink", "--ok", "--r-rare", "--r-epic", "--r-legendary", "--r-limited"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
  const o = origin ?? { x: innerWidth / 2, y: innerHeight * 0.38 };
  const parts = Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
    const speed = 6 + Math.random() * 9;
    return {
      x: o.x, y: o.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 7, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.45,
      color: colors[Math.floor(Math.random() * colors.length)] || "#d8fd71", round: Math.random() < 0.3, life: 0,
    };
  });
  const t0 = performance.now();
  const draw = (t: number) => {
    const age = t - t0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.34; p.vx *= 0.992; p.vy *= 0.992;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.globalAlpha = Math.max(0, Math.min(1, 1 - (age - 1400) / 800));
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.28); ctx.fill(); } else ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (age < 2200) requestAnimationFrame(draw); else canvas.remove();
  };
  requestAnimationFrame(draw);
}
