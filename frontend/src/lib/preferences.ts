export type TextSize = "standard" | "large";

export const TEXT_SIZE_STORAGE_KEY = "dr-scan-text-size";

export const DEFAULT_TEXT_SIZE: TextSize = "standard";

export function isTextSize(value: string): value is TextSize {
  return value === "standard" || value === "large";
}
