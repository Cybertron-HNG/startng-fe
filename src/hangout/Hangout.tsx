import { useEffect, useRef } from "react";
import { startHangout } from "./game";
import { PAGES, setSeo } from "../seo";
import "./hangout.css";

// The Hangout: start.ng's own game, an open park where everyone signed in hangs out together.
// It lives at /hangout. The game itself is in game.ts; this is the page around it.
export default function Hangout() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSeo(PAGES.hangout);
    return startHangout(rootRef.current!);
  }, []);

  return (
    <div className="hangout" ref={rootRef}>
      <canvas className="hangout-scene" />

      <header className="hangout-hud">
        <a className="hangout-brand" href="/"><b>start<span>.ng</span></b> hangout</a>
        <span className="hangout-clock" aria-label="Your local time" />
        <span className="hangout-online" hidden />
      </header>
      <button type="button" className="hangout-chat-toggle" aria-controls="hangout-chat" aria-expanded="false">
        Chat <span className="hangout-chat-badge" hidden />
      </button>
      <p className="hangout-status" hidden />
      <form className="hangout-say" autoComplete="off">
        <input placeholder="Say something… (press Enter)" aria-label="Say something" disabled />
        <button type="submit" disabled>Send</button>
      </form>
      <p className="hangout-hint" hidden>
        <b>WASD</b> or arrows to walk · <b>Shift</b> to run · <b>drag</b> to look · <b>Space</b> to wave · <b>Enter</b> to chat
      </p>
      <p className="hangout-hint-touch" hidden>Drag to look around</p>

      <div className="hangout-joystick" aria-label="Walk: drag the stick" role="application">
        <div className="hangout-joystick-knob" />
      </div>
      <button type="button" className="hangout-wave">Wave</button>
      <div className="hangout-arcade" hidden role="status">
        <span>🕹️ <b /></span>
        <button type="button">Play</button>
        <span className="hangout-arcade-key">or press <kbd>E</kbd></span>
      </div>

      <aside className="hangout-chat" id="hangout-chat" aria-label="Chat" aria-hidden="true">
        <header>
          <h2>Hangout chat</h2>
          <button type="button" className="hangout-chat-close" aria-label="Close chat">✕</button>
        </header>
        <ol className="hangout-chat-list" />
        <p className="hangout-chat-empty">No messages yet. Say hi!</p>
        <form className="hangout-chat-form" autoComplete="off">
          <input placeholder="Write a message" aria-label="Write a message" disabled />
          <button type="submit" disabled>Send</button>
        </form>
      </aside>

      <div className="hangout-overlay">
        <div className="hangout-panel">
          <h1>The Hangout</h1>
          <p>Coming in…</p>
          <button hidden />
        </div>
      </div>
    </div>
  );
}
