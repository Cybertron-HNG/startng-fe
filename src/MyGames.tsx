import { KeyboardEvent, useEffect, useState } from "react";
import { Game, GITHUB_REPO_RE, myGames, submitGame } from "./api";

const dateOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** "Your games" in the profile: paste a GitHub repo link to submit a game, see what you've submitted. */
export default function MyGames() {
  const [games, setGames] = useState<Game[] | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    myGames(token).then(setGames);
  }, [token]);

  async function upload() {
    const link = url.trim();
    if (!GITHUB_REPO_RE.test(link)) {
      setError("Only GitHub repo links work, like https://github.com/you/your-game");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const g = await submitGame(token, link);
      setGames((list) => [g, ...(list ?? [])]);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that game");
    } finally {
      setBusy(false);
    }
  }

  // This sits inside the profile form, so Enter uploads instead of saving the profile.
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      upload();
    }
  };

  return (
    <section className="my-games">
      <div className="my-games-head">
        <h3>Your games</h3>
        <span>{games ? `${games.length} uploaded` : ""}</span>
      </div>
      <p className="lead-sm">Paste the link to your game's public GitHub repo.</p>
      <div className="upload-row">
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          onKeyDown={onKey}
          aria-label="GitHub repo link"
          aria-invalid={!!error}
        />
        <button type="button" onClick={upload} disabled={busy || !url.trim()}>{busy ? "Uploading..." : "Upload"}</button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="game-cards">
        {games?.map((g) => (
          <article key={g.id} className={`game-card ${g.screenshot_url ? "" : "no-shot"}`}>
            {g.screenshot_url && <img src={g.screenshot_url} alt={`${g.repo} screenshot`} loading="lazy" />}
            <div className="game-card-body">
              <h4>{g.repo}</h4>
              {g.description && <p>{g.description}</p>}
              <div className="game-card-meta">
                <span className="tag">{g.status}</span>
                {g.language && <span>{g.language}</span>}
                <span>{dateOf(g.created_at)}</span>
              </div>
              <div className="game-card-links">
                <a href={g.repo_url} target="_blank" rel="noreferrer">GitHub ↗</a>
                <span title="Where it will live once it's deployed">{g.slug}.start.ng</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
