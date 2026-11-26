import { useEffect } from "react";
import LegalView from "./LegalView";
import { PAGES, setSeo } from "./seo";
import ThemeToggle from "./ThemeToggle";

// start.ng/terms: the rules for playing, for your account, and for publishing a game. The page is in terms.html
// already (written at build time, see vite.config.ts); this draws the same page again.
export default function Terms() {
  useEffect(() => { setSeo(PAGES.terms); }, []);
  return <LegalView page="terms" themeToggle={<ThemeToggle />} />;
}
