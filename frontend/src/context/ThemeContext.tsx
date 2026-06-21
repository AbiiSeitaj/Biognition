"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { applyTheme, getStoredTheme, THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    typeof window !== "undefined" ? getStoredTheme() : "beige"
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(mode: ThemeMode) {
    setThemeState(mode);
    applyTheme(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }

  function toggleTheme() {
    setTheme(theme === "beige" ? "dark" : "beige");
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
