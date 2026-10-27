import { useCallback, useEffect, useState } from "react";
import type { AdminTabProps } from "../registry";
import { outbox, sendTest, type Outbox } from "./api";

// start.ng/admin#email: who's subscribed, what was sent, and a test email to check sending works.

const STATUSES = ["queued", "sent", "capped", "skipped", "failed", "bounced"];
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");

export default function EmailTab({ access }: AdminTabProps) {
  const [box, setBox] = useState<Outbox | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    setError("");
    outbox(status || undefined).then(setBox).catch((e) => setError(e.message));
  }, [status]);
  useEffect(reload, [reload]);

  async function test() {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const r = await sendTest();
      setNote(r.status !== "sent" ? `Not sent (${r.status}): ${r.last_error ?? ""}`
        : box?.provider === "log" ? "Written to the server log. Sending is off, so it didn't go to your inbox."
        : `Sent to ${r.to}. Check that inbox (and spam).`);
      reload();
    } catch (e) { setError(e instanceof Error ? e.message : "That didn't work"); } finally { setBusy(false); }
  }

  return (
    <section>
      <div className="dup-head">
        <div>
          <h2>Email</h2>
          <p className="note">
            {box && (box.provider === "log" ? "Sending is off (EMAIL_PROVIDER=log): emails go to the server log." : `Sending with ${box.provider}.`)}
            {box && box.only_to.length > 0 && <> Test mode: only {box.only_to.join(", ")} get email.</>}
          </p>
        </div>
        <button type="button" className="ghost" disabled={busy} onClick={test}>Send me a test email</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {note && <p className="ok" role="status">{note}</p>}

      {box && (
        <div className="email-stats">
          <div><b>{box.subscribers}</b><span>subscribers</span></div>
          {Object.entries(box.by_topic).map(([k, n]) => <div key={k}><b>{n}</b><span>{k.replace("_", " ")}</span></div>)}
          {STATUSES.filter((s) => box.counts[s]).map((s) => <div key={s}><b>{box.counts[s]}</b><span>{s}, 7 days</span></div>)}
        </div>
      )}

      <div className="segmented email-status" role="group" aria-label="Status">
        {["", ...STATUSES].map((s) => (
          <button key={s || "all"} type="button" className={status === s ? "on" : ""} aria-pressed={status === s} onClick={() => setStatus(s)}>{s || "All"}</button>
        ))}
      </div>
      {box && box.rows.length === 0 && <p className="empty">No emails yet.</p>}
      <div className="admin-list">
        {box?.rows.map((r) => (
          <article key={r.id} className="admin-item email-row">
            <div className="admin-item-head">
              <div className="admin-item-title">
                <h3>{r.subject ?? r.kinds.join(" + ")} <span className={`pill ${r.status === "sent" ? "" : r.status === "queued" ? "waiting" : "reported"}`}>{r.status}</span></h3>
                <p className="note">to {r.to === access.email ? "you" : r.to} · {r.kinds.join(", ")} · {when(r.sent_at ?? r.created_at)}{r.attempts > 1 ? ` · ${r.attempts} tries` : ""}</p>
                {r.last_error && <p className="note">{r.last_error}</p>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
