// Event spotlight: admin API calls (startng-be app/features/events). The public side (the spotlighted event) is in ../../eventMode.ts.
import { API_URL, call, send } from "../../api";
import type { EventHighlight, EventPartner, SpotlightEvent } from "../../eventMode";

export type EventIn = {
  slug?: string | null; title: string; tagline: string | null; description: string; starts_at: string; ends_at: string | null;
  venue: string; address: string | null; ticket_url: string | null; ticket_label: string; website_url: string | null;
  highlights: EventHighlight[]; partners: EventPartner[];
};

const token = () => localStorage.getItem("token");

export const adminEvents = () => call<SpotlightEvent[]>(token(), "/admin/events");
export const createEvent = (body: EventIn) => call<SpotlightEvent>(token(), "/admin/events", send("POST", body));
export const changeEvent = (id: number, body: EventIn) => call<SpotlightEvent>(token(), `/admin/events/${id}`, send("PUT", body));
export const deleteEvent = (id: number) => call<void>(token(), `/admin/events/${id}`, send("DELETE"));
export const setSpotlight = (id: number, on: boolean) => call<SpotlightEvent>(token(), `/admin/events/${id}/spotlight`, send("PUT", { on }));
export const makeCover = (id: number, image: number) => call<SpotlightEvent>(token(), `/admin/events/${id}/images/${image}/cover`, send("PUT"));
export const deletePicture = (id: number, image: number) => call<SpotlightEvent>(token(), `/admin/events/${id}/images/${image}`, send("DELETE"));

/** Same limits as the backend (features/events/service.py). */
export const MAX_PICTURE_BYTES = 5 * 1024 * 1024;
export const MAX_PICTURES = 8;

/** Add a picture (the file is sent as is; the API checks it and saves it again as WebP). */
export async function uploadPicture(id: number, file: File, alt = ""): Promise<SpotlightEvent> {
  const res = await fetch(`${API_URL}/admin/events/${id}/images${alt ? `?alt=${encodeURIComponent(alt)}` : ""}`, {
    method: "POST", headers: { Authorization: `Bearer ${token()}`, "Content-Type": file.type || "application/octet-stream" }, body: file,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Couldn't upload that picture");
  return data;
}
