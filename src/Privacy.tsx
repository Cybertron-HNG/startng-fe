import { useEffect } from "react";
import LegalView from "./LegalView";
import { PAGES, setSeo } from "./seo";
import ThemeToggle from "./ThemeToggle";

// start.ng/privacy: what we collect, why, how long we keep it, and how to see or delete yours. The page is in
// privacy.html already (written at build time, see vite.config.ts); this draws the same page again.
export default function Privacy() {
  useEffect(() => { setSeo(PAGES.privacy); }, []);
  return <LegalView page="privacy" themeToggle={<ThemeToggle />} />;
}
