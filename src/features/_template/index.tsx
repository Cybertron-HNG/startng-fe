// TEMPLATE: copy this folder to src/features/<your_feature>/, rename things, then add ONE line to
// src/features/index.ts: import "./<your_feature>";  Delete the registrations you don't need.
// (This folder itself is never imported, so none of this shows on the site.)
import { registerAdminTab, registerCardPart, registerPage, registerProfileSection } from "../registry";

const FEATURE = "example"; // the feature flag, the same as NAME in app/features/<feature>/__init__.py

// A page. "app" puts it inside the start.ng shell (top bar, sign-in). Add its address to nginx.conf too.
registerPage({ feature: FEATURE, path: "/example", shell: "app", load: () => import("./ExamplePage") });
// A page with a parameter: /example/42 gives params.id = "42".
registerPage({ feature: FEATURE, path: /^\/example\/(?<id>\d+)\/?$/, shell: "app", load: () => import("./ExamplePage") });

// Something on every game card: "badges" (on the picture), "stats" (under the title) or "actions" (next to Play).
// Return null to leave a card alone. Your API calls go in this folder too (see call and send in src/api.ts).
registerCardPart({ feature: FEATURE, key: "example-hot", slot: "badges", render: (game) => (game.plays > 100 ? <span className="tag">Hot</span> : null) });

// A tab on start.ng/admin, for admins with the permission the back end registered (PERMISSIONS in __init__.py).
registerAdminTab({
  feature: FEATURE,
  key: "example",
  label: "Example",
  permission: "example.manage",
  Component: ({ ask }) => (
    <section>
      <h2>Example</h2>
      <button type="button" onClick={async () => { if (await ask({ title: "Do it?", confirm: "Do it" }) !== null) { /* call your API */ } }}>Do something</button>
    </section>
  ),
});

// A section on a player's profile (shown by the profile page, S1).
registerProfileSection({ feature: FEATURE, key: "example", title: "Example", Component: ({ userId }) => <p>Player {userId}</p> });
