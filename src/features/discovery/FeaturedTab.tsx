import { useCallback, useEffect, useState } from "react";
import type { AdminTabProps } from "../registry";
import { addFeatured, adminFeatured, moveFeatured, removeFeatured, type AdminFeatured, type AdminGame, type Shelf } from "./api";

// start.ng/admin#featured: choose the Featured and Staff picks shelves on the homepage (PRD A1).
export default function FeaturedTab(_: AdminTabProps) {
  const [data, setData] = useState<AdminFeatured | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const reload = useCallback(() => {
    adminFeatured().then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);

  async function run(job: () => Promise<void>) {
    setError("");
    try { await job(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    reload();
  }

  function List({ shelf, title, games }: { shelf: Shelf; title: string; games: AdminGame[] }) {
    return (
      <div>
        <h3>{title}</h3>
        {games.length === 0 && <p className="empty">Nothing here yet.</p>}
        <div className="admin-list">
          {games.map((g, i) => (
            <article key={g.game} className="admin-item">
              <div className="admin-item-head">
                <div className="admin-item-title">
                  <h3><a href={`/games/${g.game}`}>{g.title}</a></h3>
                  {!g.eligible && <p className="note">Not eligible: {g.missing.join("; ")}</p>}
                </div>
                <div className="featured-actions">
                  <button type="button" className="ghost" disabled={i === 0} onClick={() => run(() => moveFeatured(shelf, g.game, "up"))} aria-label={`Move ${g.title} up`}>↑</button>
                  <button type="button" className="ghost" disabled={i === games.length - 1} onClick={() => run(() => moveFeatured(shelf, g.game, "down"))} aria-label={`Move ${g.title} down`}>↓</button>
                  <button type="button" className="ghost" onClick={() => run(() => removeFeatured(shelf, g.game))}>Remove</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  const q = filter.trim().toLowerCase();
  const candidates = data?.candidates.filter((g) => !q || g.title.toLowerCase().includes(q) || g.game.includes(q)) ?? [];
  const onStaff = new Set(data?.staff.map((g) => g.game));

  return (
    <section>
      <h2>Featured</h2>
      <p className="note">Featured and Staff picks show at the top of the homepage. A game must meet the checklist to be added.</p>
      {error && <p className="error" role="alert">{error}</p>}
      {data && (
        <>
          <List shelf="featured" title="Featured" games={data.featured} />
          <List shelf="staff" title="Staff picks" games={data.staff} />
          <div className="dup-head">
            <h3>Add a game</h3>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name" aria-label="Filter games by name" />
          </div>
          <div className="admin-list">
            {candidates.slice(0, 30).map((g) => (
              <article key={g.game} className="admin-item">
                <div className="admin-item-head">
                  <div className="admin-item-title">
                    <h3><a href={`/games/${g.game}`}>{g.title}</a></h3>
                    {!g.eligible && <p className="note">Needs: {g.missing.join("; ")}</p>}
                  </div>
                  <div className="featured-actions">
                    <button type="button" className="ghost" disabled={!g.eligible} onClick={() => run(() => addFeatured("featured", g.game))}>Feature</button>
                    <button type="button" className="ghost" disabled={!g.eligible || onStaff.has(g.game)} onClick={() => run(() => addFeatured("staff", g.game))}>Staff pick</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {candidates.length === 0 && <p className="empty">No games match.</p>}
        </>
      )}
    </section>
  );
}
