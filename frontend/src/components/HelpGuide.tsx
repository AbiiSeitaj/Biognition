"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Brain, ChevronDown, Share2, Upload, X } from "lucide-react";

const STEPS = [
  { icon: Upload, label: "Upload scan", href: "/upload" },
  { icon: Brain, label: "Review report", href: "/" },
  { icon: Archive, label: "Saved scans", href: "/archive" },
  { icon: Share2, label: "Share with team", href: "/departments" },
];

const HELP_KEY = "drscan-help-collapsed";

export function HelpGuide() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(localStorage.getItem(HELP_KEY) !== "1");
  }, []);

  function collapse() {
    localStorage.setItem(HELP_KEY, "1");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-5 text-sm font-medium hover:underline"
        style={{ color: "var(--text-muted)" }}
      >
        Show quick start guide
      </button>
    );
  }

  return (
    <section className="card mb-5 p-3" aria-labelledby="help-guide-title">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 id="help-guide-title" className="text-sm font-semibold">
            Quick start
          </h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Upload → review → archive → share
          </p>
        </div>
        <button
          type="button"
          onClick={collapse}
          className="icon-btn-sm"
          aria-label="Hide guide"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STEPS.map(({ icon: Icon, label, href }) => (
          <Link key={href + label} href={href} className="quick-link">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={collapse}
        className="mt-2 inline-flex items-center gap-1 text-xs hover:underline"
        style={{ color: "var(--text-muted)" }}
      >
        <ChevronDown className="h-3 w-3" />
        Hide guide
      </button>
    </section>
  );
}
