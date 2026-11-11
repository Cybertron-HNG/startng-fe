import BoardTable from "./BoardTable";
import { Game } from "./games";
import { useDialog } from "./useDialog";

type Props = { game: Game; playerId: number | null; onClose: () => void };

/** The leaderboard popup (the "Leaderboard" link on a game's card). */
export default function GameBoard({ game, playerId, onClose }: Props) {
  const dialogRef = useDialog(true, onClose);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card board" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="board-title" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h3 id="board-title">{game.title}</h3>
          <button type="button" className="link close" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <p className="board-sub">Top players on start.ng</p>
        <BoardTable game={game} playerId={playerId} />
        <a className="btn board-play" href={game.url} target="_blank" rel="noreferrer">Play {game.title} ↗</a>
      </div>
    </div>
  );
}
