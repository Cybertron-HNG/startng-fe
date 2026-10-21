import { useEffect, useState } from "react";
import type { PageProps } from "../registry";
import { PAGES, setSeo } from "../../seo";
import { createCrew, CrewSummary, Kind, KINDS, myCrews } from "./api";

const KIND_LABEL: Record<Kind, string> = { family: "Family", school: "School", class: "Class", city: "City", friends: "Friends" };

/** start.ng/crews: your crews, and a form to make one. */
export default function MyCrews({ user, onSignIn }: PageProps) {
  const [mine, setMine] = useState<CrewSummary[] | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("friends");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setSeo(PAGES.crews), []);
  useEffect(() => {
    if (!user) { setMine([]); return; }
    myCrews().then(setMine).catch(() => setMine([]));
  }, [user?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return onSignIn();
    setBusy(true);
    setError("");
    try {
      location.assign(`/crews/${(await createCrew({ name, kind })).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make the crew");
      setBusy(false);
    }
  }

  return (
    <section className="container tournament-page">
      <div className="section-head">
        <div>
          <h1>Crews</h1>
          <p className="tournament-sub">A crew is your people in one place: family, a class, a city or friends. Make one, send the link, and everyone who joins is in. <a href="/friends">Tournaments with friends →</a></p>
        </div>
      </div>

      <form className="private-form" onSubmit={submit}>
        <label className="field">
          <span>Crew name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={40} required placeholder="e.g. Lagos Cousins" />
        </label>
        <div className="field">
          <span>What kind of crew</span>
          <div className="segmented" role="group" aria-label="Kind of crew">
            {KINDS.map((k) => (
              <button key={k} type="button" className={kind === k ? "on" : ""} aria-pressed={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
            ))}
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="private-submit">
          <button type="submit" disabled={busy}>{!user ? "Sign in to make a crew" : busy ? "Making…" : "Make crew"}</button>
          <p className="note">You can be in up to 5 crews, and a crew holds up to 200 people.</p>
        </div>
      </form>

      <section aria-labelledby="crews-heading">
        <h2 id="crews-heading" className="private-heading">Your crews</h2>
        {mine === null && <p className="board-sub">Loading…</p>}
        {mine?.length === 0 && <p className="board-empty">{user ? "None yet. Make one above, or open a crew's invite link." : "Sign in to see yours."}</p>}
        <ul className="private-list">
          {mine?.map((c) => (
            <li key={c.id}>
              <a href={`/crews/${c.id}`}>
                <b>{c.name}</b>
                <span>{KIND_LABEL[c.kind]} · {c.members} {c.members === 1 ? "person" : "people"}</span>
              </a>
              {c.mine && <span className="tag">Yours</span>}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
