import { useEffect, useState } from "react";

// The round button at the bottom of the screen: near the top it jumps to the bottom of the
// page, anywhere else back to the top. Hidden when the page doesn't scroll.
export default function ScrollJump() {
  const [nearTop, setNearTop] = useState(true);
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const update = () => {
      const room = document.documentElement.scrollHeight - innerHeight;
      setScrolls(room > 200);
      setNearTop(scrollY < Math.min(300, room / 2));
    };
    update();
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    // The page grows as games and docs load.
    const grow = new ResizeObserver(update);
    grow.observe(document.body);
    return () => {
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
      grow.disconnect();
    };
  }, []);

  if (!scrolls) return null;
  const label = nearTop ? "Scroll to the bottom" : "Back to the top";
  return (
    <button
      type="button"
      className="scroll-jump"
      aria-label={label}
      title={label}
      onClick={() => {
        const behavior: ScrollBehavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
        scrollTo({ top: nearTop ? document.documentElement.scrollHeight : 0, behavior });
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={{ transform: nearTop ? "rotate(180deg)" : undefined }}>
        <path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
