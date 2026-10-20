import { ChangeEvent, KeyboardEvent, useEffect, useState } from "react";
import {
  COVER_TYPES, GITHUB_REPO_RE, MAX_COVER_BYTES, myGames, myGamesOrThrow, Problem, publishGame, PublishedGame, PublishFailed, removeCover, unpublishGame, uploadCover,
} from "./api";
import { toCard } from "./games";
import Boundary from "./features/Boundary";
import { useFeatures } from "./features/flags";
import { allYourGameParts } from "./features/registry";

// A picture the owner uploaded (not the game's own cover.png), so it can be removed.
const isUploaded = (g: PublishedGame) => !!g.cover_url && new URL(g.cover_url).pathname === "/startng-cover.webp";

const dateOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// The API sends UTC; if a time arrives without a timezone, read it as UTC rather than local time.
const utc = (iso: string) => new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`);

const ago = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - utc(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : dateOf(iso);
};

/** Whether start.ng is picking up pushes to this game's repo, in one line. */
function UpdateStatus({ game }: { game: PublishedGame }) {
  const paused = game.updates_paused_until && utc(game.updates_paused_until) > new Date();
  if (paused) {
    const at = utc(game.updates_paused_until!).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return (
      <p className="update-status paused">
        Updates are paused by GitHub's limit until {at}. After that, start.ng checks your repo again, and a push that passes the checks goes live.
      </p>
    );
  }
  if (!game.checked_at) return <p className="update-status">Not checked yet: start.ng will look at your repo shortly.</p>;
  return (
    <p className="update-status">
      Repo checked {ago(game.checked_at)}
      {game.live_commit && <> · live: <code>{game.live_commit}</code></>}
    </p>
  );
}

/** What start.ng found in a game, one line each. */
function ProblemList({ problems }: { problems: Problem[] }) {
  return (
    <ul className="problems">
      {problems.map((p, i) => <li key={i}>{p.message}</li>)}
    </ul>
  );
}

/** "Your games" in the profile: paste a GitHub repo link to put your game on start.ng, and manage your games. */
export default function MyGames() {
  const [games, setGames] = useState<PublishedGame[] | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Every problem from a refused upload, or the warnings from one that went live.
  const [problems, setProblems] = useState<Problem[]>([]);
  const [warnings, setWarnings] = useState<Problem[]>([]);
  const [busy, setBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState<string | null>(null); // the game whose picture is uploading
  const token = localStorage.getItem("token");
  const isOn = useFeatures();

  const refresh = () => myGames(token).then(setGames);
  useEffect(() => {
    refresh();
    // Keep "checked 3 min ago" and the live commit current while the profile stays open.
    // A failed refresh keeps the list on screen instead of replacing it with an empty one.
    const quietly = () => { if (document.visibilityState === "visible") myGamesOrThrow(token).then(setGames).catch(() => {}); };
    const timer = window.setInterval(quietly, 30000);
    document.addEventListener("visibilitychange", quietly);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", quietly);
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload() {
    const link = url.trim();
    if (!GITHUB_REPO_RE.test(link)) {
      setError("Only GitHub repo links work, like https://github.com/you/your-game");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    setProblems([]);
    setWarnings([]);
    try {
      const res = await publishGame(token, link);
      setNotice(`${res.created ? "Live" : "Updated"} at ${new URL(res.url).host}`);
      setWarnings(res.warnings);
      setUrl("");
      await refresh();
    } catch (err) {
      if (err instanceof PublishFailed && err.problems.length > 1) {
        setError("start.ng found some problems. Fix them, push to GitHub, and upload again:");
        setProblems(err.problems);
      } else {
        setError(err instanceof Error ? err.message : "Could not upload that game");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(name: string) {
    if (!window.confirm(`Take ${name} offline? Its address will be free for anyone to use.`)) return;
    setError("");
    setNotice("");
    try {
      await unpublishGame(token, name);
      setGames((list) => (list ?? []).filter((g) => g.name !== name));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that game");
    }
  }

  const replace = (game: PublishedGame) => setGames((list) => (list ?? []).map((g) => (g.name === game.name ? game : g)));

  async function changeCover(name: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still uploads
    if (!file) return;
    setError("");
    setNotice("");
    if (!COVER_TYPES.includes(file.type)) return setError("Use a PNG, JPEG or WebP picture");
    if (file.size > MAX_COVER_BYTES) return setError("The picture must be 2 MB or less");
    setCoverBusy(name);
    try {
      replace(await uploadCover(token, name, file));
      setNotice("Cover updated. It shows on the homepage too.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that picture");
    } finally {
      setCoverBusy(null);
    }
  }

  async function dropCover(name: string) {
    setError("");
    setNotice("");
    setCoverBusy(name);
    try {
      replace(await removeCover(token, name));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the picture");
    } finally {
      setCoverBusy(null);
    }
  }

  // This sits inside the profile form, so Enter must not save the profile. It doesn't upload either
  // while the Upload button is disabled.
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.preventDefault();
  };

  return (
    <section className="my-games">
      <div className="my-games-head">
        <h3>Your games</h3>
        <span>{games ? `${games.length} live` : ""}</span>
      </div>
      <p className="lead-sm">Paste your game's public GitHub repo link. It goes live at its own start.ng address.</p>
      <div className="upload-row">
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          onKeyDown={onKey}
          placeholder="Looking for an easy way out, huh?"
          aria-label="GitHub repo link"
          aria-invalid={!!error}
        />
        {/* Uploading from the profile is switched off for now: the button stays disabled. */}
        <button type="button" onClick={upload} disabled>{busy ? "Uploading..." : "Upload"}</button>
      </div>
      {error && <p className="error">{error}</p>}
      {problems.length > 0 && <ProblemList problems={problems} />}
      {notice && <p className="ok">{notice}</p>}
      {warnings.length > 0 && (
        <div className="warnings">
          <b>Worth fixing</b>
          <ProblemList problems={warnings} />
        </div>
      )}

      <div className="game-cards">
        {games?.map((g) => {
          const card = toCard(g);
          return (
            <article key={g.name} className="game-card">
              <div className="art" style={{ background: `linear-gradient(135deg, ${card.colors[0]}, ${card.colors[1]})` }}>
                {card.cover ? <img src={card.cover} alt={`${card.title} cover`} /> : <span>{card.title.charAt(0)}</span>}
              </div>
              <div className="game-card-body">
                <h4>{card.title}</h4>
                <div className="game-card-meta">
                  <span className="tag">Live</span>
                  <span>Updated {dateOf(g.updated_at)}</span>
                </div>
                <UpdateStatus game={g} />
                <div className="game-card-links">
                  <a href={g.url} target="_blank" rel="noreferrer">Play ↗</a>
                  <a href={g.repo_url} target="_blank" rel="noreferrer">GitHub ↗</a>
                  <span>{card.host}</span>
                  <button type="button" className="link remove" onClick={() => remove(g.name)}>Remove</button>
                </div>
                <div className="game-card-links cover-links">
                  <label className={coverBusy === g.name ? "cover-pick busy" : "cover-pick"}>
                    {coverBusy === g.name ? "Saving picture..." : card.cover ? "Change cover" : "Add cover"}
                    <input type="file" accept={COVER_TYPES.join(",")} disabled={coverBusy !== null} onChange={(e) => changeCover(g.name, e)} />
                  </label>
                  {isUploaded(g) && (
                    <button type="button" className="link" disabled={coverBusy !== null} onClick={() => dropCover(g.name)}>Remove cover</button>
                  )}
                </div>
              </div>
              {/* Reported, flagged or blocked: hidden from start.ng. Features with their own reason explain it themselves. */}
              {(g.hidden === "reported" || g.hidden === "flagged" || g.hidden === "blocked") && (
                <div className="update-problem" role="status">
                  <b>Hidden from start.ng</b>
                  <span>
                    {g.hidden === "reported" ? "Our team reviewed a report about this game and hid it for now. We'll reach out about what to fix."
                      : g.hidden === "flagged" ? "Our team flagged this game, so it's hidden for now. We'll reach out about what to fix."
                      : "Your account is blocked, so your games are hidden."}
                  </span>
                </div>
              )}
              {/* Features' own parts (src/features/registry.ts, registerYourGamePart) */}
              {allYourGameParts().filter((p) => isOn(p.feature)).map((p) => (
                <Boundary key={p.key} name={p.key}>
                  <p.Component game={g} reload={refresh} />
                </Boundary>
              ))}
              {/* The latest push didn't pass the checks: the game kept its last version. */}
              {g.update_problem && (
                <div className="update-problem" role="status">
                  <b>Your latest push didn't go live</b>
                  <span>
                    Commit <code>{g.update_problem.commit.slice(0, 7)}</code>, {dateOf(g.update_problem.at)}. Players still get the
                    last version. Fix this and push again:
                  </span>
                  <ProblemList problems={g.update_problem.errors.length ? g.update_problem.errors : [{ code: "invalid", message: g.update_problem.detail, file: null }]} />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
