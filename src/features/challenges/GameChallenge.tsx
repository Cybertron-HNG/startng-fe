import { useEffect, useState } from "react";
import type { PagePartProps } from "../registry";
import { canChallenge } from "./api";
import ChallengeButton from "./ChallengeButton";

/** "Challenge a friend" on a game's page: a challenge from your best run, which opens its page to share. Only for a
 *  signed-in player who has played the game, since a challenge is one of your runs. */
export default function GameChallenge({ game, user }: PagePartProps) {
  const [can, setCan] = useState(false);
  useEffect(() => {
    setCan(false);
    if (!game || !user || !localStorage.getItem("token")) return;
    let live = true;
    canChallenge(game).then((r) => live && setCan(r.can)).catch(() => {});
    return () => { live = false; };
  }, [game, user]);
  if (!game || !can) return null;
  return (
    <div className="game-page-share challenge-make">
      <span>Beat my score</span>
      <ChallengeButton game={game} />
    </div>
  );
}
