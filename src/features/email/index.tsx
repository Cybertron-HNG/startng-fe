import { Suspense } from "react";
import { registerPagePart, registerProfileSection, registerTab } from "../registry";
import { EmailPrefs } from "./EmailPrefs";
import TournamentEmail from "./TournamentEmail";

registerTab({
  feature: "email",
  key: "email",
  title: "Email",
  adminOnly: true,
  loader: () => import("./EmailTab"),
});

registerTab({
  feature: "email",
  key: "announcements",
  title: "Announcements",
  adminOnly: true,
  loader: () => import("./EmailTab"),
});

// The player's own profile shows their email preferences; someone else looking at their profile doesn't see them.
registerProfileSection({
  feature: "email",
  key: "email",
  title: "Emails",
  ownerOnly: true,
  Component: () => <Suspense fallback={null}><EmailPrefs /></Suspense>,
});

registerPagePart({ feature: "email", key: "email", page: "tournament", Component: TournamentEmail });
