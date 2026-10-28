// Screenshots (Ziki #19, Oluwaseyifunmi): API calls (startng-be app/features/screenshots).
import { call } from "../../api";

/** A picture from the game's own folder, on its address (<name>.start.ng). */
export type Screenshot = { url: string; alt: string };

export const getScreenshots = (game: string) =>
  call<{ screenshots: Screenshot[] }>(null, `/games/${encodeURIComponent(game)}/screenshots`).then((r) => r.screenshots);
