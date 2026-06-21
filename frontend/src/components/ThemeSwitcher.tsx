"use client";

import { Briefcase, Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { THEMES, type ThemeId } from "@/lib/themes";
import { useTheme } from "./ThemeProvider";

const ICONS: Record<ThemeId, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  professional: Briefcase,
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="seg-control hidden lg:flex" role="radiogroup" aria-label="Appearance">
      {THEMES.map(({ id, label, description }) => {
        const Icon = ICONS[id];
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            title={description}
            onClick={() => setTheme(id)}
            className={clsx("seg-option", active && "seg-option-active")}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ThemeSwitcherMobile() {
  const { theme, setTheme } = useTheme();

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as ThemeId)}
      className="select-field seg-select lg:hidden"
      aria-label="Appearance"
    >
      {THEMES.map(({ id, label }) => (
        <option key={id} value={id}>
          {label}
        </option>
      ))}
    </select>
  );
}
