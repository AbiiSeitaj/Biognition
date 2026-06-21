export type ThemeId = "light" | "dark" | "professional";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  description: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: "light",
    label: "Light",
    description: "Standard clinical workstation",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Low-light reading room",
  },
  {
    id: "professional",
    label: "Professional",
    description: "Warm, calm hospital screens",
  },
];

export const THEME_STORAGE_KEY = "dr-scan-theme";

export const DEFAULT_THEME: ThemeId = "light";

const LEGACY_THEME_MAP: Record<string, ThemeId> = {
  enterprise: "professional",
  pacs: "light",
};

export function normalizeThemeId(value: string | null | undefined): ThemeId {
  if (!value) return DEFAULT_THEME;
  if (value in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[value];
  return THEMES.some((t) => t.id === value) ? (value as ThemeId) : DEFAULT_THEME;
}

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}
