// Game jams (Ziki #35). The flag is "jams" (startng-be app/features/jams). Adds the jam page (/jam/<slug>, also written by the
// server: nginx.conf asks the API) and an admin tab to make jams.
import { lazy, Suspense } from "react";
import { registerAdminTab, registerPage, type AdminTabProps } from "../registry";

const JamsTab = lazy(() => import("./JamsTab"));
const FEATURE = "jams";

registerPage({ feature: FEATURE, path: /^\/jam\/(?<slug>[a-z0-9][a-z0-9-]{1,38}[a-z0-9])\/?$/, shell: "app", load: () => import("./JamPage") });
registerAdminTab({
  feature: FEATURE,
  key: "jams",
  label: "Game jams",
  order: 95,
  permission: "jams.manage",
  Component: (props: AdminTabProps) => (
    <Suspense fallback={<p className="note" role="status">Loading…</p>}>
      <JamsTab {...props} />
    </Suspense>
  ),
});
