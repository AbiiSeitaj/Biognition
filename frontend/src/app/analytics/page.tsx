"use client";

import { useEffect, useState } from "react";
import { Activity, BarChart3, Loader2, ShieldAlert, TrendingUp } from "lucide-react";
import { ReportComparisonPanel } from "@/components/ReportComparisonPanel";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ModalityBreakdown } from "@/components/ModalityBreakdown";
import { SystemFlowDiagram } from "@/components/SystemFlowDiagram";
import { PacsNetworkPanel } from "@/components/PacsNetworkPanel";
import { api } from "@/lib/api";
import type { Analytics, Stats, WorkflowData } from "@/lib/types";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    function load() {
      Promise.all([api.getAnalytics(), api.getStats(), api.getWorkflow()])
        .then(([a, s, w]) => {
          setAnalytics(a);
          setStats(s);
          setWorkflow(w);
          setError("");
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load analytics"))
        .finally(() => setLoading(false));
    }
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ai)" }} />
        Loading analytics…
      </div>
    );
  }

  if (error || !analytics || !stats) {
    return (
      <div className="p-8 text-center text-sm" style={{ color: "var(--danger)" }}>
        {error || "Analytics unavailable"}
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4">
      <header className="border-b border-[var(--border)] pb-3">
        <h1 className="text-sm font-semibold uppercase tracking-wide">Analytics & Operations</h1>
        <p className="mt-0.5 text-xs text-muted">
          AI performance, pipeline throughput, and interdepartmental alert metrics
        </p>
      </header>

      {workflow && (
        <>
          <SystemFlowDiagram title={workflow.title} steps={workflow.steps} compact />
          <PacsNetworkPanel nodes={workflow.pacs_network.nodes} buildings={workflow.pacs_network.buildings} />
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={BarChart3}
          label="Total studies"
          value={String(stats.total_studies)}
          hint={`${stats.archived_studies} archived to PACS`}
        />
        <KpiCard
          icon={ShieldAlert}
          label="High-risk cases"
          value={String(stats.high_risk_count)}
          hint="Requires radiologist review"
          accent="var(--danger)"
        />
        <KpiCard
          icon={TrendingUp}
          label="Pending analysis"
          value={String(stats.pending_analysis)}
          hint="Awaiting AI pipeline"
          accent="var(--warning)"
        />
        <KpiCard
          icon={Activity}
          label="Unread alerts"
          value={String(analytics.unread_notifications)}
          hint={`${analytics.total_notifications} total routed`}
        />
      </div>

      <AnalyticsPanel analytics={analytics} />

      <ReportComparisonPanel comparisons={analytics.report_comparisons ?? []} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ModalityBreakdown stats={stats} />
        <ActivityFeed events={analytics.recent_activity} />
      </div>

      <section className="panel p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Workflow summary</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SummaryBlock
            title="Upload → Analyze"
            value={`${analytics.pipeline.uploaded} → ${analytics.pipeline.analyzed}`}
            detail="Studies entering the AI pipeline"
          />
          <SummaryBlock
            title="Archive rate"
            value={`${Math.round((analytics.pipeline.archived / Math.max(analytics.pipeline.uploaded, 1)) * 100)}%`}
            detail={`${analytics.pipeline.archived} studies in PACS archive`}
          />
          <SummaryBlock
            title="Alert load"
            value={`${analytics.total_notifications}`}
            detail={`${analytics.unread_notifications} pending department review`}
          />
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-2xl font-semibold tabular-nums" style={{ color: accent ?? "var(--text)" }}>
            {value}
          </p>
          <p className="text-xs font-medium">{label}</p>
          <p className="mt-0.5 text-[10px] text-muted">{hint}</p>
        </div>
        <Icon className="h-4 w-4 shrink-0 text-muted" />
      </div>
    </div>
  );
}

function SummaryBlock({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="border border-[var(--border)] p-3" style={{ borderRadius: "var(--radius)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted">{detail}</p>
    </div>
  );
}
