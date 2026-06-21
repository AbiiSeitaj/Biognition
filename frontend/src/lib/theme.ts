export type ThemeMode = "beige" | "dark";

export const THEME_STORAGE_KEY = "drscan-theme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "beige";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" ? "dark" : "beige";
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = mode;
}
