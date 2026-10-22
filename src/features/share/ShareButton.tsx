import { useState } from "react";
import { call } from "../../api";
import { useFeature } from "../flags";

// <ShareButton kind="tournament_result" id="12.34" /> (PRD B2, contract C8). Asks the API for the link, the text to post
// and the card picture, then: on a phone, opens the share menu with the picture attached; anywhere else, opens X with
// the text and link ready. "Copy link" is always there. Shows nothing while the share feature is off.

type Shared = { url: string; text: string; image_url: string; square_image_url: string };

const get = (kind: string, id: string) => call<Shared>(null, `/share/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`);

/** The card as a file for the phone's share menu, or null when this device can't attach files. */
async function pictureFile(url: string): Promise<File | null> {
  if (typeof navigator.canShare !== "function" || !matchMedia("(pointer: coarse)").matches) return null;
  try {
    const blob = await fetch(url).then((r) => (r.ok ? r.blob() : Promise.reject(new Error("no picture"))));
    const file = new File([blob], "startng.png", { type: "image/png" });
    return navigator.canShare({ files: [file] }) ? file : null;
  } catch {
    return null;
  }
}

export default function ShareButton({ kind, id, label = "Share", className }: { kind: string; id: string; label?: string; className?: string }) {
  const on = useFeature("share");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  if (!on) return null;

  async function share() {
    setBusy(true);
    setNote("");
    try {
      const s = await get(kind, id);
      const file = await pictureFile(s.square_image_url);
      if (file) {
        try {
          await navigator.share({ files: [file], text: s.text, url: s.url });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return; // they closed the menu
        }
      }
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(s.text)}&url=${encodeURIComponent(s.url)}`, "_blank", "noopener");
    } catch {
      setNote("Couldn't make a share link. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    setNote("");
    try {
      const s = await get(kind, id);
      await navigator.clipboard.writeText(s.url);
      setNote("Link copied.");
    } catch {
      setNote("Couldn't copy the link.");
    }
  }

  return (
    <span className={className ?? "share-buttons"}>
      <button type="button" disabled={busy} onClick={share}>{busy ? "..." : label}</button>
      <button type="button" className="ghost" onClick={copy}>Copy link</button>
      {note && <span className="note" role="status">{note}</span>}
    </span>
  );
}
