import type { ReactNode } from "react";
import { AvatarFace } from "../../Avatar";
import { styleFor } from "../../character";
import { displayName, type Player } from "./api";

/** One player in a list: their character's face and name, and whatever goes on the right (buttons). */
export default function PlayerRow({ player, children }: { player: Player; children?: ReactNode }) {
  return (
    <li className="follows-row">
      <AvatarFace style={player.character?.style ?? styleFor(player.id)} size={40} />
      <span className="follows-name" title={displayName(player)}>{displayName(player)}</span>
      <div className="follows-actions">
        {children}
      </div>
    </li>
  );
}
