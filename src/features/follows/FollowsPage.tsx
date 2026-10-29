import { useEffect, useRef, useState } from "react";
import type { PageProps } from "../registry";
import { PAGES, setSeo } from "../../seo";
import FollowButton from "./FollowButton";
import PlayerRow from "./PlayerRow";
import QuickMessagePicker from "./QuickMessagePicker";
import QuickMessagesInbox from "./QuickMessagesInbox";
import { makeInvite, myPeople, type Invite, type ListKind, type People } from "./api";
import "./follows.css";

type TabKind = ListKind | "messages";

const TABS: { kind: TabKind; label: string; empty: string }[] = [
  { kind: "friends", label: "Friends", empty: "No friends yet. Send someone your invite link above." },
  { kind: "following", label: "Following", empty: "You're not following anyone yet." },
  { kind: "followers", label: "Followers", empty: "Nobody follows you yet." },
  { kind: "messages", label: "Messages", empty: "No messages yet." },
];

/** start.ng/follows: your invite link, friends, messages, following and followers. Only you see these lists. */
export default function FollowsPage({ user, onSignIn }: PageProps) {
  const [tab, setTab] = useState<TabKind>("friends");
  const [lists, setLists] = useState<Partial<Record<ListKind, People>>>({});
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const reloadGeneration = useRef(0);

  useEffect(() => setSeo(PAGES.follows), []);

  function reload() {
    const generation = ++reloadGeneration.current;
    setError("");
    const kinds: ListKind[] = ["friends", "following", "followers"];
    Promise.all(kinds.map((k) => myPeople(k)))
      .then(([friends, following, followers]) => {
        if (generation === reloadGeneration.current) setLists({ friends, following, followers });
      })
      .catch(() => {
        if (generation === reloadGeneration.current) setError("Couldn't load your lists. Try again in a moment.");
      });
  }

  useEffect(() => {
    reloadGeneration.current++;
    setLists({});
    if (user) reload();
  }, [user?.id]);

  if (!user) {
    return (
      <section className="container follows-page">
        <h1>Friends</h1>
        <p className="empty">Sign in to see your friends and invite new ones. <button type="button" className="link" onClick={onSignIn}>Sign in</button></p>
      </section>
    );
  }

  const link = invite ? `${location.origin}${invite.path}` : "";
  const canShare = typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches;
  const text = "Be my friend on start.ng, so we can see each other's games and scores:";

  async function getLink() {
    setBusy(true);
    setError("");
    try {
      setInvite(await makeInvite());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* Link remains on page to copy manually */ }
  }

  async function share() {
    try {
      await navigator.share({ title: "start.ng", text, url: link });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") copy();
    }
  }

  const current = tab !== "messages" ? lists[tab] : null;
  const shown = TABS.find((t) => t.kind === tab)!;

  return (
    <section className="container follows-page">
      <h1>Friends</h1>

      <div className="follows-invite">
        <div>
          <h2>Invite a friend</h2>
          <p className="note">Anyone who opens your link and accepts becomes your friend. It works for 7 days and you can send it to as many people as you like.</p>
        </div>
        {!invite ? (
          <button type="button" disabled={busy} onClick={getLink}>{busy ? "..." : "Get my invite link"}</button>
        ) : (
          <div className="follows-link">
            <code>{link}</code>
            <div className="private-share">
              {canShare && <button type="button" onClick={share}>Share the link</button>}
              <a className={canShare ? "btn ghost" : "btn"} href={`https://wa.me/?${new URLSearchParams({ text: `${text} ${link}` })}`} target="_blank" rel="noreferrer">Invite on WhatsApp</a>
              <button type="button" className="ghost" onClick={copy}>{copied ? "Link copied" : "Copy link"}</button>
            </div>
          </div>
        )}
      </div>

      <div className="follows-tabs" role="group" aria-label="Your lists">
        {TABS.map((t) => {
          const count = t.kind !== "messages" && lists[t.kind] ? ` (${lists[t.kind]!.count})` : "";
          return (
            <button
              key={t.kind}
              type="button"
              aria-pressed={tab === t.kind}
              className={tab === t.kind ? "on" : ""}
              onClick={() => setTab(t.kind)}
            >
              {t.label}{count}
            </button>
          );
        })}
      </div>

      {error && <p className="error">{error}</p>}

      {tab === "messages" ? (
        <QuickMessagesInbox />
      ) : (
        <>
          {!current && !error && <p className="board-sub">Loading...</p>}
          {current && current.count === 0 && <p className="empty">{shown.empty}</p>}
          {current && current.count > 0 && (
            <ul className="follows-list">
              {current.people.map((p) => (
                <PlayerRow key={p.id} player={p}>
                  {tab === "friends" && (
                    <QuickMessagePicker
                      recipientId={p.id}
                      recipientName={p.character?.name ?? p.name ?? "Friend"}
                    />
                  )}
                  <FollowButton
                    userId={p.id}
                    name={p.character?.name ?? p.name ?? undefined}
                    onSignIn={onSignIn}
                    onChange={reload}
                  />
                </PlayerRow>
              ))}
            </ul>
          )}
        </>
      )}

      <p className="note follows-private">Only you can see these lists and messages. Other players only see how many followers you have.</p>
    </section>
  );
}
