"use client";

import clsx from "clsx";
import { usePreferences } from "./PreferencesProvider";

export function TextSizeToggle() {
  const { textSize, setTextSize } = usePreferences();

  return (
    <div className="seg-control hidden sm:flex" role="group" aria-label="Text size">
      <button
        type="button"
        onClick={() => setTextSize("standard")}
        className={clsx("seg-option", textSize === "standard" && "seg-option-active")}
      >
        Standard
      </button>
      <button
        type="button"
        onClick={() => setTextSize("large")}
        className={clsx("seg-option", textSize === "large" && "seg-option-active")}
      >
        Large
      </button>
    </div>
  );
}
