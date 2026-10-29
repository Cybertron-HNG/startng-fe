import type { PagePartProps } from "../registry";
import { formatUpdatedAgo, isRecentlyUpdated } from "../../games";

export default function WhatsNewBox({ currentGame }: PagePartProps) {
  if (!currentGame || !currentGame.updated_at) return null;

  const isRecent = isRecentlyUpdated(currentGame.updated_at);
  if (!isRecent) return null;

  const updatedAgo = formatUpdatedAgo(currentGame.updated_at);
  if (!updatedAgo) return null;

  const message =
    currentGame.description ||
    "The creator has published recent improvements and updates to this game on start.ng.";

  return (
    <div className="whats-new-box" role="region" aria-label="What's new in this game">
      <div className="whats-new-head">
        <span className="whats-new-title">What&apos;s New</span>
        <span className="whats-new-date">Updated {updatedAgo}</span>
      </div>
      <p className="whats-new-text">{message}</p>
    </div>
  );
}
