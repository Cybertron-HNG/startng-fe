import type { Tournament } from "./api";

// The bar at the bottom of the screen on phones (Ziki #48): every main page one thumb-tap away. Only shown below the
// 760 px breakpoint (styles.css, .tab-bar); computers keep the top bar. Games and the Hangout don't render the App
// shell, so the bar never covers them.
type Tab = "home" | "games" | "tournament" | "me";

export default function TabBar({ current, tournament, signedIn, onMe }: {
  current: Tab | null;
  tournament: Tournament | null | undefined;
  signedIn: boolean;
  onMe: () => void; // the profile when signed in, sign-in when not
}) {
  // A dot while today's tournament is running and this player hasn't entered it.
  const tournamentDot = !!tournament && !tournament.finished && !tournament.entered;
  const link = (tab: Tab, href: string, icon: string, label: string, dot = false) => (
    <a href={href} aria-current={current === tab ? "page" : undefined}>
      <span className="tab-icon" aria-hidden="true">{icon}</span>
      <span className="tab-label">{label}</span>
      {dot && <span className="tab-dot" role="status" aria-label="Today's tournament is on" />}
    </a>
  );
  return (
    <nav className="tab-bar" aria-label="Main">
      {link("home", "/", "🏠", "Home")}
      {link("games", "/games", "🎮", "Games")}
      {link("tournament", "/tournament", "🏆", "Tournament", tournamentDot)}
      <a href="/hangout"><span className="tab-icon" aria-hidden="true">🛋️</span><span className="tab-label">Hangout</span></a>
      <button type="button" onClick={onMe} aria-current={current === "me" ? "page" : undefined}>
        <span className="tab-icon" aria-hidden="true">👤</span>
        <span className="tab-label">{signedIn ? "Me" : "Sign in"}</span>
      </button>
    </nav>
  );
}
