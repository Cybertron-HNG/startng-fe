import { useEffect, useState } from "react";
import type { PageProps } from "../registry";
import { PAGES, setSeo } from "../../seo";
import { AvatarFace } from "../../Avatar";
import FollowButton from "../follows/FollowButton";
import ShareButton from "../share_cards/ShareButton";
import { getCreator, saveBio, type Creator } from "./api";
import "./creator_hub.css";

/** start.ng/by/<id>-<name>: a creator's page. Their games and totals, a Follow button, and Share. Never an email. */
export default function CreatorPage({ user, onSignIn, params }: PageProps) {
  const id = Number(params.id);
  const [c, setC] = useState<Creator | null | undefined>(undefined); // null: no such creator
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");

  useEffect(() => {
    let live = true;
    setError("");
    getCreator(id)
      .then((got) => {
        if (!live) return;
        setC(got);
        setSeo({
          ...PAGES.creator,
          title: `${got.name}'s games · start.ng`,
          description: got.bio || PAGES.creator.description,
          path: `/by/${got.slug}`,
        });
        if (location.pathname !== `/by/${got.slug}`) history.replaceState(null, "", `/by/${got.slug}`);
      })
      .catch((e) => {
        if (!live) return;
        if (e instanceof Error && /No creator/.test(e.message)) {
          setC(null);
          setSeo({ ...PAGES.notFound, title: "No creator here · start.ng", path: location.pathname });
        } else setError("Couldn't load this page. Try again in a moment.");
      });
    return () => { live = false; };
  }, [id, user?.id]);

  async function saveYourBio() {
    try {
      const saved = await saveBio(bio);
      setC((cur) => (cur ? { ...cur, bio: saved.bio } : cur));
      setEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save that"); }
  }

  if (c === undefined && !error) return <section className="container creator-page"><p className="board-sub">Loading...</p></section>;
  if (c === null) {
    return (
      <section className="container creator-page">
        <h1>No creator here</h1>
        <p className="lead-sm">There's no creator at this address, or they have no games live right now.</p>
        <p><a className="btn" href="/by">See top creators</a></p>
      </section>
    );
  }
  if (!c) return <section className="container creator-page"><p className="error" role="alert">{error}</p></section>;

  return (
    <section className="container creator-page">
      <header className="creator-head">
        {c.character?.style && <AvatarFace style={c.character.style} size={84} />}
        <div>
          <h1>{c.name}</h1>
          {c.bio && !editing && <p className="lead-sm">{c.bio}</p>}
          <div className="creator-actions">
            {!c.me && <FollowButton userId={c.id} name={c.name} onSignIn={onSignIn} showCount />}
            {c.me && c.followers !== null && <span className="note">{c.followers} {c.followers === 1 ? "follower" : "followers"}</span>}
            <ShareButton kind="creator" id={String(c.id)} />
            {c.me && !editing && <button type="button" className="link" onClick={() => { setBio(c.bio ?? ""); setEditing(true); }}>{c.bio ? "Edit bio" : "Add a bio"}</button>}
          </div>
          {editing && (
            <div className="creator-bio-edit">
              <textarea value={bio} maxLength={200} rows={3} onChange={(e) => setBio(e.target.value)} aria-label="Your bio" placeholder="A line about you and your games" />
              <div className="creator-actions">
                <button type="button" onClick={saveYourBio}>Save</button>
                <button type="button" className="ghost" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="creator-stats">
        <div><b>{c.games.length}</b><span>{c.games.length === 1 ? "game" : "games"}</span></div>
        <div><b>{c.total_plays.toLocaleString()}</b><span>plays</span></div>
        <div><b>{c.players_30.toLocaleString()}</b><span>{c.players_30 === 1 ? "player" : "players"}, 30 days</span></div>
        {c.followers !== null && <div><b>{c.followers.toLocaleString()}</b><span>{c.followers === 1 ? "follower" : "followers"}</span></div>}
      </div>

      <h2>Games</h2>
      <div className="creator-games">
        {c.games.map((g) => (
          <a key={g.name} href={`/games/${g.name}`} className="creator-game">
            {g.cover_url ? <img src={g.cover_url} alt="" loading="lazy" /> : <span className="tile">{g.title.charAt(0)}</span>}
            <span><b>{g.title}</b><em>{g.plays_30.toLocaleString()} plays this month</em></span>
          </a>
        ))}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
