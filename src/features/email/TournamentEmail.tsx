import { useEffect, useState } from "react";
import type { PagePartProps } from "../registry";
import { mine, setMine, subscribe, type MyEmail } from "./api";

// On start.ng/tournament: get each day's tournament (and, signed in, how you did, and a reminder) by email.
export default function TournamentEmail({ user }: PagePartProps) {
  return (
    <aside className="tournament-email" aria-label="Tournament emails">
      <div>
        <b>Get the tournament by email</b>
        <p className="note">One email at 6 PM: who won, and the new games. At most one a day.</p>
      </div>
      {user ? <SignedIn /> : <Visitor />}
    </aside>
  );
}

function SignedIn() {
  const [me, setMe] = useState<MyEmail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { mine().then(setMe).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="error">{error}</p>;
  if (!me) return null;
  const on = me.topics.filter((t) => t.on).map((t) => t.key);
  const save = (topics: string[]) => { setMine(topics).then(setMe).catch((e) => setError(e.message)); };
  return (
    <div className="tournament-email-actions">
      {on.includes("tournament") && on.includes("results") ? (
        <p className="note">You get these, with how you did. <a href="/emails">Your emails →</a></p>
      ) : (
        <button type="button" onClick={() => save([...new Set([...on, "tournament", "results"])])}>Email me, with how I did</button>
      )}
      <Reminder on={on} save={save} />
    </div>
  );
}

/** "Remind me": one email 10 minutes before each day's tournament starts (Ziki #60). Easy to turn off again here. */
function Reminder({ on, save }: { on: string[]; save: (topics: string[]) => void }) {
  if (on.includes("reminder")) {
    return (
      <p className="note">
        We'll email you 10 minutes before each tournament starts.{" "}
        <button type="button" className="link" onClick={() => save(on.filter((t) => t !== "reminder"))}>Stop reminders</button>
      </p>
    );
  }
  return <button type="button" className="ghost" onClick={() => save([...on, "reminder"])}>Remind me 10 minutes before</button>;
}

function Visitor() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try { setSent((await subscribe(email.trim(), ["tournament"])).detail); } catch (err) { setError(err instanceof Error ? err.message : "That didn't work"); } finally { setBusy(false); }
  }

  if (sent) return <p className="ok" role="status">{sent}</p>;
  return (
    <form className="email-signup-row" onSubmit={submit}>
      <input id="tournament-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" aria-label="Your email" />
      <button type="submit" disabled={busy || !email.trim()}>Email me</button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
