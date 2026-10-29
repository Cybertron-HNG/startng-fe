// Names, colours and little pictures for the wardrobe. Rarity order matches startng-be catalog.py.
import type { Rarity, Slot } from "./api";

export const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "limited"];
export const SLOTS: Slot[] = ["hat", "accessory", "outfit", "neck", "back", "aura"];

export const SLOT_NAMES: Record<Slot, string> = {
  hat: "Hat", accessory: "Extra", outfit: "Outfit", neck: "Neck", back: "Back", aura: "Aura",
};

// A picture for each item until the 3D character draws them (three/human.ts). Unknown items use their slot's.
const PICTURES: Record<string, string> = {
  bucket_hat: "👒", sunglasses: "🕶️", wristband: "⌚", plain_hoodie: "🧥",
  kufi: "🧢", headphones: "🎧", ankara_top: "👕", bead_necklace: "📿",
  gele: "🎀", agbada: "🥻", gold_chain: "⛓️", explorer_cap: "🧭",
  silver_crown: "👑", streak_scarf: "🧣", champion_sash: "🎗️", veteran_jacket: "🎖️",
  gem_crown: "💎", tournament_cape: "🦸", flame_aura: "🔥",
  pioneer_pin: "📍", detty_december_hat: "🎅",
};
const SLOT_PICTURES: Record<Slot, string> = { hat: "🎩", accessory: "✨", outfit: "👕", neck: "🧣", back: "🎒", aura: "🌟" };

export const picture = (key: string, slot: Slot) => PICTURES[key] ?? SLOT_PICTURES[slot];

// Why coins changed, in the wallet's history.
const REASONS: Record<string, string> = {
  first_run: "First game of the day", new_game: "Tried a new game", game_goal: "Game goal",
  streak: "Streak", level: "Level up", top_10: "Top 10", first_place: "#1 on a board",
  tournament: "Daily tournament", challenge: "Beat a challenge", league: "League promotion",
  shop: "Bought", admin: "From start.ng", tip_out: "Tipped a creator", tip_in: "Tip from a player",
};
export const reason = (r: string) => REASONS[r] ?? r.replace(/_/g, " ");

export const share = (n: number) => (n === 0 ? "Nobody has it yet" : n < 0.01 ? "Owned by under 1% of players" : `Owned by ${Math.round(n * 100)}% of players`);
export const coins = (n: number) => `${n.toLocaleString()} ${n === 1 ? "coin" : "coins"}`;
