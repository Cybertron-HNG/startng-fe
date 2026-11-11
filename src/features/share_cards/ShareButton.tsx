// The Share button every feature uses (PRD B2):
//   import ShareButton from "../share_cards/ShareButton";
//   <ShareButton kind="challenge" id={code} />
// Phones get their share menu with the square card attached (WhatsApp, Instagram...); computers get X, WhatsApp and
// Copy link, where the pasted link shows the wide card as its preview. Shows nothing while share cards are off or there's
// nothing to share.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { analytics } from "../../analytics";
import { useFeature } from "../flags";
import { getShare, type ShareInfo, type ShareKind } from "./api";
import { withHandle } from "../../share";

const FEATURE = "share_cards";

const isPhone = () => typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches;

/** The square card as a file, for phones that can attach it to a share, else null. */
async function cardFile(info: ShareInfo): Promise<File | null> {
  if (typeof navigator.canShare !== "function") return null;
  try {
    const blob = await fetch(info.square_image_url).then((r) => (r.ok ? r.blob() : Promise.reject(new Error("no image"))));
    const file = new File([blob], "startng.jpg", { type: "image/jpeg" });
    return navigator.canShare({ files: [file] }) ? file : null;
  } catch {
    return null;
  }
}

type Props = {
  kind: ShareKind;
  id: string;
  fallback?: {
    title: string;
    text: string;
    url: string;
  };
  label?: string; // the phone button's words
  intro?: ReactNode; // shown before the buttons, and only when there's something to share ("Your result on Tuesday")
  ghost?: boolean; // use ghost button styling (used on game and indie game pages)
  onShared?: () => void;
};

export default function ShareButton({ kind, id, fallback, label = "Share", intro, ghost = false, onShared }: Props) {
  const on = useFeature(FEATURE);
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const phone = isPhone();
  const [ready, setReady] = useState(!phone || !!fallback); // phones: the card picture is fetched (or couldn't be)
  const file = useRef<File | null>(null); // fetched ahead: a phone only shares straight after the tap

  useEffect(() => {
    file.current = null;
    if (!phone || !!fallback) setReady(true);
    if (!on) return;

    let live = true;
    getShare(kind, id)
      .then(async (s) => {
        if (!live) return;
        setInfo(s);
        if (s && phone) file.current = await cardFile(s);
        if (live) setReady(true);
      })
      .catch(() => {
        if (live) {
          setInfo(null);
          setReady(true);
        }
      });
    return () => { live = false; };
  }, [on, kind, id, phone, fallback]);

  const data = info ?? fallback ?? null;
  if (!data) return null;

  const post = `${data.text} ${data.url}`;
  const shared = (method: "x" | "copy_link" | "whatsapp" | "share_menu") => {
    const category = kind === "game" ? "game" : kind === "indie_game" ? "indie_game" : "share_card";
    const itemId = category === "share_card" ? `${kind}/${id}` : id;
    analytics.share(category, itemId, method);
    onShared?.();
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(data!.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      shared("copy_link");
    } catch { /* nothing to copy to: the buttons beside it still work */ }
  }

  function shareOnPhone() {
    const shareData: ShareData = file.current
      ? { files: [file.current], text: post }
      : { title: data!.title, text: data!.text, url: data!.url };
    navigator.share(shareData)
      .then(() => shared("share_menu"))
      .catch((err) => { if (err?.name !== "AbortError") copy(); }); // cancelled: nothing to do
  }

  const phoneBtnClass = ghost ? "btn ghost" : "";
  const xBtnClass = ghost ? "btn ghost" : "btn";
  const waBtnClass = "btn ghost";
  const copyBtnClass = "ghost";
  const xLabel = kind === "game" || kind === "indie_game" ? "Share on X" : "Post on X";

  const buttons = phone ? (
    <button type="button" className={phoneBtnClass} onClick={shareOnPhone} disabled={!ready}>
      {label}
    </button>
  ) : (
    <div className="share-row">
      <a
        className={xBtnClass}
        href={`https://twitter.com/intent/tweet?${new URLSearchParams({ text: withHandle(data.text), url: data.url })}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => shared("x")}
      >
        {xLabel}
      </a>
      <a
        className={waBtnClass}
        href={`https://wa.me/?${new URLSearchParams({ text: post })}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => shared("whatsapp")}
      >
        WhatsApp
      </a>
      <button type="button" className={copyBtnClass} onClick={copy}>
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
  return intro ? <div className="share-block"><p>{intro}</p>{buttons}</div> : buttons;
}
