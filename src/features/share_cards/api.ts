// Share cards' API calls (startng-be app/features/share_cards).
const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

/** Every kind of card (KINDS in startng-be app/features/share_cards/service.py). */
export type ShareKind = "challenge" | "tournament_result" | "unlock" | "league_move" | "private_tournament" | "creator" | "profile" | "score";

export type ShareInfo = {
  url: string; // start.ng/s/<kind>/<id>: what goes in the post
  text: string; // ready-made words for the post
  image_url: string; // 1200x630
  square_image_url: string; // 1080x1080, attached on phones
  title: string;
  path: string; // where the link takes people on start.ng
};

/** null: nothing to share there (missing, private, or share cards are off). */
export async function getShare(kind: ShareKind, id: string): Promise<ShareInfo | null> {
  const res = await fetch(`${API_URL}/share/${kind}/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Couldn't load the share card");
  return res.json();
}
