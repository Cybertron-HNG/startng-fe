import { useEffect, useRef, useState } from "react";
import SketchLogo from "./SketchLogo";
import { celebrate, countUp } from "./motion";

const SAMPLES = [
  ["Lane Dash", ["#f2c94c", "#d9361b"], "L"], ["Jumpy", ["#6fd3a8", "#2f7d63"], "J"], ["Star Hop", ["#9b5de5", "#5b7ff0"], "S"],
  ["Battle Test", ["#f2994a", "#e0425a"], "B"], ["Ghost Game", ["#56ccf2", "#2d6fb3"], "G"], ["Dave", ["#bb6bd9", "#6a3ad1"], "D"],
] as const;

/** /motion: the prototype's three moments in one place, with Replay buttons. Not linked from anywhere. */
export default function MotionLab() {
  const [hero, setHero] = useState(0);
  const [unlock, setUnlock] = useState(0);
  const xp = useRef<HTMLSpanElement>(null);
  const rank = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!unlock) return;
    if (xp.current) countUp(xp.current, 250, 1100);
    if (rank.current) countUp(rank.current, 3, 1100, 12);
  }, [unlock]);

  return (
    <main className="container mo-lab">
      <p className="eyebrow">Motion prototype</p>
      <h1>Three moments</h1>
      <p className="lead-sm">A first look at how start.ng could feel. Plain CSS and a little code, no new libraries, and everything switches off for people who ask their device for less motion.</p>

      <section>
        <h2>1. The homepage hero</h2>
        <p className="note">The lines rise in, the lime highlight sweeps in, and the sketch of our logo draws itself, then floats.</p>
        <div className="bar"><button type="button" onClick={() => setHero((n) => n + 1)}>Replay</button></div>
        <div className="container hero" key={hero}>
          <SketchLogo className="hero-sketch" />
          <p className="eyebrow">Big imagination. Played everywhere.</p>
          <h1>Good vibes.<br /><mark>Good games.</mark></h1>
          <p className="lead">Games made by builders in the community.<br />Pick one and play right in your browser.</p>
          <div className="actions"><a className="btn" href="/#games">Play now</a><a className="ghost btn" href="/games">Browse games</a></div>
        </div>
        <p className="note">The sketch sits in the top right corner on screens wider than about 760px.</p>
      </section>

      <section>
        <h2>2. Cards that react</h2>
        <p className="note">Move your mouse over a card: it leans towards you, glows where the pointer is, and the picture zooms. Press it to squeeze. They also rise in as you scroll to them.</p>
        <div className="cards">
          {SAMPLES.map(([title, colors, letter]) => (
            <article className="game" key={title}>
              <a className="game-link" href="/games">
                <div className="art" style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}><span>{letter}</span></div>
                <div className="info"><h3>{title}</h3><span className="by">by start.ng</span></div>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>3. A celebration</h2>
        <p className="note">For a win, an unlocked item or a new best: confetti in the site's own colours, a card that pops in, and numbers that count up.</p>
        <div className="bar">
          <button type="button" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); celebrate({ x: r.left + r.width / 2, y: r.top }); }}>Confetti from here</button>
          <button type="button" className="ghost" onClick={() => { setUnlock((n) => n + 1); celebrate(); }}>Unlock something</button>
        </div>
        {unlock > 0 && (
          <div className="mo-unlock pop" key={unlock}>
            <span className="tag">New personal best</span>
            <span className="big">+<span ref={xp}>0</span> XP</span>
            <span className="rank">You're now #<span ref={rank}>12</span></span>
          </div>
        )}
      </section>
    </main>
  );
}
