import { useEffect, useState } from "react";
import { AvatarFace } from "../../Avatar";
import { styleFor } from "../../character";
import {
  getQuickMessages,
  markQuickMessageRead,
  muteUser,
  unmuteUser,
  getMutedUsers,
  displayName,
  type QuickMessage,
} from "./api";

function timeAgo(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export default function QuickMessagesInbox() {
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [mutedIds, setMutedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [msgRes, muted] = await Promise.all([getQuickMessages(), getMutedUsers()]);
      setMessages(msgRes.messages);
      setMutedIds(new Set(muted));
    } catch {
      // Ignored if unauthenticated or network error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, []);

  async function handleRead(id: number) {
    try {
      await markQuickMessageRead(id);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read_at: new Date().toISOString() } : m))
      );
    } catch {
      // Best-effort
    }
  }

  async function toggleMute(senderId: number) {
    const isMuted = mutedIds.has(senderId);
    try {
      if (isMuted) {
        await unmuteUser(senderId);
        setMutedIds((prev) => {
          const next = new Set(prev);
          next.delete(senderId);
          return next;
        });
      } else {
        await muteUser(senderId);
        setMutedIds((prev) => new Set(prev).add(senderId));
      }
    } catch {
      // Best effort
    }
  }

  if (loading) {
    return <p className="note">Loading messages…</p>;
  }

  if (messages.length === 0) {
    return (
      <div className="quick-msg-empty">
        <p className="note">No messages yet. Send a quick message to a friend after playing!</p>
      </div>
    );
  }

  return (
    <div className="quick-msg-inbox">
      <ul className="quick-msg-list">
        {messages.map((m) => {
          const isMuted = mutedIds.has(m.sender.id);
          const isUnread = !m.read_at;
          return (
            <li
              key={m.id}
              className={`quick-msg-item ${isUnread ? "unread" : ""}`}
              onClick={() => isUnread && handleRead(m.id)}
            >
              <AvatarFace
                style={m.sender.character?.style ?? styleFor(m.sender.id)}
                size={36}
              />
              <div className="quick-msg-content">
                <div className="quick-msg-top">
                  <span className="quick-msg-sender">{displayName(m.sender)}</span>
                  <span className="quick-msg-time">{timeAgo(m.created_at)}</span>
                </div>
                <div className="quick-msg-body">
                  <span className="quick-msg-badge">{m.preset}</span>
                  {m.game_name && (
                    <a
                      href={`/g/${m.game_name}`}
                      className="quick-msg-action"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ▶ Play game
                    </a>
                  )}
                  {m.challenge_code && (
                    <a
                      href={`/c/${m.challenge_code}`}
                      className="quick-msg-action"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ⚔ View challenge
                    </a>
                  )}
                </div>
              </div>
              <div className="quick-msg-actions">
                <button
                  type="button"
                  className="quick-msg-mute-btn"
                  title={isMuted ? "Unmute messages from this player" : "Mute messages from this player"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute(m.sender.id);
                  }}
                >
                  {isMuted ? "🔇 Muted" : "Mute"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
