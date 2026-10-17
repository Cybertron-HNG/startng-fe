// Light or dark. The saved choice wins; otherwise follow the device setting.
// index.html runs the same check before the page paints, so there is no flash.
export type Theme = "light" | "dark";

const KEY = "theme";
const THEME_COLOR: Record<Theme, string> = { light: "#f6f5ee", dark: "#121310" };

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private mode or storage blocked: the choice just lasts until the page closes.
  }
}
