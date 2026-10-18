import { useEffect, useState } from "react";

// Light or dark. With no saved choice the site follows the device's setting; once you tap the
// button your choice is saved (localStorage "theme") and wins. index.html applies it before paint.
type Theme = "light" | "dark";
const THEME_COLOR: Record<Theme, string> = { light: "#f6f5ee", dark: "#292a23" };

const systemTheme = (): Theme => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
const current = (): Theme => {
  const set = document.documentElement.getAttribute("data-theme");
  return set === "dark" || set === "light" ? set : systemTheme();
};
const paintBar = (t: Theme) => document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[t]);

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(current);

  useEffect(() => {
    paintBar(theme);
  }, [theme]);

  // No saved choice: follow the device when its setting changes.
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (!document.documentElement.hasAttribute("data-theme")) setTheme(systemTheme()); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch { /* private mode: lasts until the page closes */ }
    setTheme(next);
  }

  const dark = theme === "dark";
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
      {dark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  );
}
