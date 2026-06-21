"use client";

import type { Analytics } from "@/lib/types";

const RISK_COLORS: Record<string, string> = {
  low: "var(--success)",
  moderate: "var(--warning)",
  high: "var(--danger)",
  critical: "#7f1d1d",
};

export function AnalyticsPanel({ analytics }: { analytics: Analytics }) {
  const totalRisk = Object.values(analytics.risk_distribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <section className="card p-5">
      <h2 className="section-title mb-4">AI performance snapshot</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Avg risk score"
          value={`${Math.round(analytics.avg_risk_score * 100)}%`}
          hint="Across analyzed studies"
        />
        <Metric
          label="Avg AI confidence"
          value={`${Math.round(analytics.avg_confidence * 100)}%`}
          hint="Per detected finding"
        />
        <Metric
          label="Reports generated"
          value={String(analytics.analyzed_studies)}
          hint="Fully structured reads"
        />
        <Metric
          label="Alerts sent"
          value={String(analytics.total_notifications)}
          hint={`${analytics.unread_notifications} unread`}
        />
      </div>

      <div className="mt-6">
        <p className="mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Risk distribution
        </p>
        <div className="flex h-4 overflow-hidden" style={{ borderRadius: "var(--radius-sm)" }}>
          {Object.entries(analytics.risk_distribution).map(([level, count]) =>
            count > 0 ? (
              <div
                key={level}
                title={`${level}: ${count}`}
                style={{
                  width: `${(count / totalRisk) * 100}%`,
                  background: RISK_COLORS[level] ?? "var(--border)",
                }}
              />
            ) : null
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          {Object.entries(analytics.risk_distribution).map(([level, count]) => (
            <span key={level} className="flex items-center gap-1.5 capitalize">
              <span
                className="inline-block h-2.5 w-2.5"
                style={{ background: RISK_COLORS[level], borderRadius: 2 }}
              />
              {level} ({count})
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(analytics.pipeline).map(([key, val]) => (
          <div
            key={key}
            className="px-3 py-2 text-center"
            style={{
              background: "var(--surface-muted)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
            }}
          >
            <p className="text-2xl font-semibold tabular-nums">{val}</p>
            <p className="text-sm capitalize" style={{ color: "var(--text-secondary)" }}>
              {key.replace(/_/g, " ")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div
      className="p-3"
      style={{
        background: "var(--surface-muted)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {hint}
      </p>
    </div>
  );
}
