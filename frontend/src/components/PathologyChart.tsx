"use client";

import type { AnomalyFinding } from "@/lib/types";

export function PathologyChart({ anomalies }: { anomalies: AnomalyFinding[] }) {
  if (anomalies.length === 0) return null;

  const sorted = [...anomalies].sort((a, b) => b.confidence - a.confidence);

  return (
    <section className="card p-5">
      <h3 className="section-title mb-1">Finding confidence</h3>
      <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        AI certainty per detected pathology — useful for triage and audit.
      </p>
      <ul className="space-y-3">
        {sorted.map((a, i) => {
          const pct = Math.round(a.confidence * 100);
          return (
            <li key={`${a.label}-${i}`}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{a.label}</span>
                <span className="tabular-nums font-semibold">{pct}%</span>
              </div>
              <div
                className="h-3 overflow-hidden"
                style={{
                  background: "var(--surface-muted)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: barColor(a.severity),
                    borderRadius: "var(--radius-sm)",
                  }}
                />
              </div>
              <p className="mt-0.5 text-xs capitalize" style={{ color: "var(--text-muted)" }}>
                {a.region.replace(/_/g, " ")} · {a.severity}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function barColor(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
    case "high":
      return "var(--danger)";
    case "moderate":
      return "var(--warning)";
    default:
      return "var(--success)";
  }
}
