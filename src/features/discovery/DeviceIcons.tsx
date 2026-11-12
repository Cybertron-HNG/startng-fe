import type { Game } from "../../games";
import type { PagePartProps } from "../registry";

// Whether a game works on a laptop (every game does) and on a phone ("mobile": true in its startng.json, from the API).
// The server writes the same words on the game's page (startng-be app/features/discovery/server_page.py): keep them in step.

const LAPTOP = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></svg>;
const PHONE = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></svg>;
const NO_PHONE = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2M3 3l18 18" /></svg>;

const phoneWords = (mobile: boolean) => (mobile ? "Mobile ready" : "Not mobile ready");

/** On a game card, over the picture: the two icons, with the words as a tooltip and for screen readers. */
export function CardDevices({ game }: { game: Game }) {
  const phone = phoneWords(game.mobile);
  return (
    <span className="device-icons" role="img" aria-label={`Works on laptop. ${phone}`}>
      <span className="device" title="Works on laptop">{LAPTOP}</span>
      <span className={game.mobile ? "device" : "device off"} title={phone}>{game.mobile ? PHONE : NO_PHONE}</span>
    </span>
  );
}

/** On a game's page, under its name: bigger icons with the words beside them. */
export function GameDevices({ info }: PagePartProps) {
  if (!info) return null;
  return (
    <p className="device-icons big">
      <span className="device">{LAPTOP}Works on laptop</span>{" "}
      <span className={info.mobile ? "device" : "device off"}>{info.mobile ? PHONE : NO_PHONE}{phoneWords(info.mobile)}</span>
    </p>
  );
}
