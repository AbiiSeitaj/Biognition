"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_TEXT_SIZE,
  TEXT_SIZE_STORAGE_KEY,
  type TextSize,
  isTextSize,
} from "@/lib/preferences";

interface PreferencesContextValue {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readTextSize(): TextSize {
  if (typeof window === "undefined") return DEFAULT_TEXT_SIZE;
  const stored = localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
  return stored && isTextSize(stored) ? stored : DEFAULT_TEXT_SIZE;
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>(DEFAULT_TEXT_SIZE);

  useEffect(() => {
    const stored = readTextSize();
    setTextSizeState(stored);
    document.documentElement.setAttribute("data-text-size", stored);
  }, []);

  const setTextSize = useCallback((size: TextSize) => {
    setTextSizeState(size);
    document.documentElement.setAttribute("data-text-size", size);
    localStorage.setItem(TEXT_SIZE_STORAGE_KEY, size);
  }, []);

  const value = useMemo(() => ({ textSize, setTextSize }), [textSize, setTextSize]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
