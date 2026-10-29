// H1 email and notifications (Hamzat): start.ng/emails (choose your emails; where confirm and unsubscribe links land),
// the admin tabs "Email" and "Newsletter", the email section on your own profile, and the sign-up box on the tournament page.
// Sending runs on the API (app/features/email).
import { lazy, Suspense } from "react";
import { registerAdminTab, registerPage, registerPagePart, registerProfileSection, type AdminTabProps } from "../registry";
import TournamentEmail from "./TournamentEmail";

const EmailTab = lazy(() => import("./EmailTab"));
const NewsletterTab = lazy(() => import("./NewsletterTab"));
const EmailPrefs = lazy(() => import("./EmailPrefs"));

registerPage({ feature: "email", path: "/emails", shell: "app", load: () => import("./EmailsPage") });

registerAdminTab({
  feature: "email",
  key: "email",
  label: "Email",
  order: 40,
  permission: "email.view",
  Component: (props: AdminTabProps) => (
    <Suspense fallback={null}>
      <EmailTab {...props} />
    </Suspense>
  ),
});

registerAdminTab({
  feature: "email",
  key: "newsletter",
  label: "Newsletter",
  order: 41,
  permission: "newsletter.send",
  Component: (props: AdminTabProps) => (
    <Suspense fallback={null}>
      <NewsletterTab {...props} />
    </Suspense>
  ),
});

registerProfileSection({
  feature: "email",
  key: "email",
  title: "Emails",
  ownerOnly: true,
  Component: () => <Suspense fallback={null}><EmailPrefs /></Suspense>,
});

registerPagePart({ feature: "email", key: "email", page: "tournament", Component: TournamentEmail });
