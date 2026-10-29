import { useEffect, useState } from "react";

// "Add start.ng to your home screen", on phones only, from the player's second visit (never the first), until they close
// it or add the site. Chrome on Android hands over its own install prompt (beforeinstallprompt), so the tip gets an Add
// button; iPhones and other browsers have no such prompt, so the tip says where to tap. The app's name, colours and icons
// come from public/manifest.webmanifest.

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const VISITS = "startng-visits"; // localStorage: visits so far; sessionStorage: this visit is already counted
const CLOSED = "startng-install-tip"; // localStorage: the player closed the tip or added the site

// Private windows and blocked storage throw: the tip simply never shows there.
function stored<T>(read: () => T): T | null {
  try {
    return read();
  } catch {
    return null;
  }
}

export default function InstallTip() {
  const [show, setShow] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const phone = matchMedia("(pointer: coarse)").matches;
    const added = matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!phone || added || stored(() => localStorage.getItem(CLOSED))) return;
    let visits = Number(stored(() => localStorage.getItem(VISITS)) ?? 0);
    if (!stored(() => sessionStorage.getItem(VISITS))) {
      visits += 1;
      stored(() => {
        localStorage.setItem(VISITS, String(visits));
        sessionStorage.setItem(VISITS, "1");
      });
    }
    if (visits < 2) return;
    setShow(true);
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep Chrome's own banner away; the tip's Add button opens it instead
      setPrompt(e as InstallPrompt);
    };
    const onAdded = () => close();
    addEventListener("beforeinstallprompt", onPrompt);
    addEventListener("appinstalled", onAdded);
    return () => {
      removeEventListener("beforeinstallprompt", onPrompt);
      removeEventListener("appinstalled", onAdded);
    };
  }, []);

  function close() {
    stored(() => localStorage.setItem(CLOSED, "1"));
    setShow(false);
  }

  async function add() {
    if (!prompt) return;
    await prompt.prompt();
    if ((await prompt.userChoice).outcome === "accepted") close();
    setPrompt(null); // the prompt works once
  }

  if (!show) return null;
  const how = prompt ? "Open it in one tap, like an app." : iphone ? "Tap Share, then Add to Home Screen." : "Open your browser's menu, then Add to Home screen.";
  return (
    <aside className="install-tip" aria-label="Add start.ng to your home screen">
      <img src="/icon-192.png" alt="" width={40} height={40} />
      <p>
        <b>Add start.ng to your home screen</b>
        <span>{how}</span>
      </p>
      {prompt && <button type="button" onClick={add}>Add</button>}
      <button type="button" className="link close" aria-label="Close" onClick={close}>✕</button>
    </aside>
  );
}
