import { useState } from "react";
import { QUICK_MESSAGE_PRESETS, sendQuickMessage, FollowsError } from "./api";

interface QuickMessagePickerProps {
  recipientId: number;
  recipientName: string;
  gameName?: string;
  challengeCode?: string;
  onSent?: (preset: string) => void;
}

export default function QuickMessagePicker({
  recipientId,
  recipientName,
  gameName,
  challengeCode,
  onSent,
}: QuickMessagePickerProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(preset: string) {
    setSending(true);
    setError(null);
    try {
      await sendQuickMessage(recipientId, preset, gameName, challengeCode);
      setStatus(`Sent "${preset}" to ${recipientName}!`);
      onSent?.(preset);
      setTimeout(() => {
        setOpen(false);
        setStatus(null);
      }, 1200);
    } catch (e) {
      if (e instanceof FollowsError) {
        if (e.code === "muted") {
          setError("This player has muted messages.");
        } else if (e.code === "rate_limited") {
          setError("Slow down! Too many messages recently.");
        } else {
          setError(e.message);
        }
      } else {
        setError("Failed to send message.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="quick-msg-wrap">
      <button
        type="button"
        className="btn quick-msg-trigger"
        onClick={() => {
          setOpen(!open);
          setError(null);
          setStatus(null);
        }}
        title={`Send quick message to ${recipientName}`}
        aria-expanded={open}
      >
        💬 Quick msg
      </button>

      {open && (
        <div className="quick-msg-popover" role="dialog" aria-label={`Send message to ${recipientName}`}>
          <div className="quick-msg-header">
            <span className="quick-msg-title">Message to {recipientName}</span>
            <button
              type="button"
              className="quick-msg-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {status ? (
            <p className="quick-msg-success">{status}</p>
          ) : (
            <>
              <div className="quick-msg-presets">
                {QUICK_MESSAGE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="quick-msg-chip"
                    disabled={sending}
                    onClick={() => handleSend(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              {error && <p className="quick-msg-error">{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
