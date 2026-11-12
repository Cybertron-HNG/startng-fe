// Phone check (Ziki #14, Daniel). The flag is "phone_check" (startng-be app/features/phone_check).
// Your games gets "Phone check" under each game: what start.ng found when it looked at the game at phone sizes.
import { registerYourGamePart } from "../registry";
import PhoneCheckPanel from "./PhoneCheckPanel";

registerYourGamePart({ feature: "phone_check", key: "phone-check", order: 55, Component: PhoneCheckPanel });
