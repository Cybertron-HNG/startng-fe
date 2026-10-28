import { useState } from "react";
import { admin, REPORT_REASONS, ReportReason, reportGame } from "./api";

// "Report this game" on a game's page (signed-in players), and "Flag game" for admins. Either one hides the game
// from start.ng until an admin looks at it.
export default function ReportDialog({ game, title, mode, onClose, onDone }: {
  game: string;
  title: string;
  mode: "report" | "flag";
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [attachDiagnostics, setAttachDiagnostics] = useState(true);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const flag = mode === "flag";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return setError("Pick a reason");
    if (reason === "other" && !details.trim()) return setError("Say what's wrong with the game");
    setState("sending");
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (flag) await admin.flag(token, game, reason, details.trim());
      else await reportGame(token, game, reason, details.trim());
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send it");
      setState("idle");
    }
  }

  return (
    <div className="overlay" onClick={state === "sent" ? onDone : onClose}>
      <form className="card report" role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="card-head">
          <h3 id="report-title">{flag ? `Flag ${title}` : `Report ${title}`}</h3>
          <button type="button" className="link close" aria-label="Close" onClick={state === "sent" ? onDone : onClose}>✕</button>
        </div>
        {state === "sent" ? (
          <>
            <p className="note">
              {flag ? "Flagged. The game is hidden from start.ng until an admin puts it back." : "Thanks. Our team will look at it and take it down if it breaks the rules."}
            </p>
            <button type="button" onClick={onDone}>Done</button>
          </>
        ) : (
          <>
            <p className="note">{flag ? "Flagging hides the game from start.ng at once." : "What's wrong with it? Our team reviews every report."}</p>
            <fieldset className="reasons">
              <legend className="sr-only">Reason</legend>
              {REPORT_REASONS.map(([key, label]) => (
                <label key={key} className={reason === key ? "on" : undefined}>
                  <input type="radio" name="reason" value={key} checked={reason === key} onChange={() => setReason(key)} />
                  {label}
                </label>
              ))}
            </fieldset>
            <label className="report-details">
              <span>Details {reason === "other" ? "" : "(optional)"}</span>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3}
                placeholder="What happened, and where in the game?" />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : flag ? "Flag and hide" : "Send report"}</button>
          </>
        )}
      </form>
    </div>
  );
}
