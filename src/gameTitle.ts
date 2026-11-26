// A game's name for people, worked out from its address: "cork-fc" -> "Cork FC". The same as the API's (startng-be app/names.py).
const ACRONYMS = new Set(["2d", "3d", "ai", "atm", "dj", "fc", "fps", "hq", "ng", "pc", "rpg", "tv", "ui", "uk", "usa", "vip", "vr"]);

export const gameTitle = (name: string) =>
  name.split("-").map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
