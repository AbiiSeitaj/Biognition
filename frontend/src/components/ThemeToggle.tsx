"use client";

import { Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={clsx("theme-toggle", compact && "theme-toggle-compact")}
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        onClick={() => setTheme("beige")}
        className={clsx("theme-toggle-btn", theme === "beige" && "theme-toggle-btn-active")}
        aria-pressed={theme === "beige"}
      >
        <Sun className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {!compact && <span>Beige</span>}
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={clsx("theme-toggle-btn", theme === "dark" && "theme-toggle-btn-active")}
        aria-pressed={theme === "dark"}
      >
        <Moon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {!compact && <span>Dark</span>}
      </button>
    </div>
  );
}
