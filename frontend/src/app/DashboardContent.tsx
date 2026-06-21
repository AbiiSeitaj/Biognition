"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Brain,
  Scan,
  Upload,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Analytics, Stats, Study } from "@/lib/types";
import { StudyCard } from "@/components/StudyCard";
import { RiskBadge } from "@/components/RiskBadge";
import { ModalityBreakdown } from "@/components/ModalityBreakdown";
import { SearchFilterBar, filterStudies } from "@/components/SearchFilterBar";
import { HelpGuide } from "@/components/HelpGuide";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [studies, setStudies] = useState<Study[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [modality, setModality] = useState("ALL");
  const [risk, setRisk] = useState("ALL");

  function refresh() {
    Promise.all([api.getStudies(), api.getStats(), api.getAnalytics()])
      .then(([s, st, an]) => {
        setStudies(s);
        setStats(st);
        setAnalytics(an);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(
    () => filterStudies(studies, query, modality, risk),
    [studies, query, modality, risk]
  );

  const highRisk = studies.filter(
    (s) => s.report && (s.report.risk_level === "high" || s.report.risk_level === "critical")
  );

  return (
    <div className="mx-auto max-w-[1400px] p-4 lg:p-6">
      <header className="page-header flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Home</h1>
          <p className="page-subtitle">
            View patient scans, check reports, and open urgent cases.
          </p>
        </div>
        <Link href="/upload" className="btn-primary">
          <Upload className="h-4 w-4" />
          Upload scan
        </Link>
      </header>

      <HelpGuide />

      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Scan} label="All patient scans" value={stats.total_studies} />
          <StatCard icon={Archive} label="Saved to archive" value={stats.archived_studies} />
          <StatCard icon={AlertTriangle} label="Needs attention" value={stats.high_risk_count} />
          <StatCard icon={Brain} label="Not yet analyzed" value={stats.pending_analysis} />
        </div>
      )}

      {stats && (
        <div className="mb-6">
          <ModalityBreakdown stats={stats} />
        </div>
      )}

      {analytics && (
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AnalyticsPanel analytics={analytics} />
          </div>
          <ActivityFeed events={analytics.recent_activity} />
        </div>
      )}

      {highRisk.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title flex items-center gap-2" style={{ color: "var(--danger)" }}>
              <AlertTriangle className="h-5 w-5" />
              Patients who need a quick review
            </h2>
            <Link
              href="/notifications"
              className="text-base font-medium hover:underline"
              style={{ color: "var(--primary)" }}
            >
              See all urgent alerts
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {highRisk.slice(0, 3).map((s) => (
              <Link
                key={s.id}
                href={`/viewer/${s.id}`}
                className="card-hover flex items-center gap-4 p-4"
              >
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center"
                  style={{
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-muted)",
                    border: "1px solid var(--danger)",
                    color: "var(--danger)",
                  }}
                >
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{s.patient.name}</p>
                  <p className="truncate text-base" style={{ color: "var(--text-secondary)" }}>
                    {s.description || s.body_part}
                  </p>
                </div>
                {s.report && (
                  <RiskBadge level={s.report.risk_level} score={s.report.risk_score} size="md" />
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-4">
        <SearchFilterBar
          query={query}
          onQueryChange={setQuery}
          modality={modality}
          onModalityChange={setModality}
          risk={risk}
          onRiskChange={setRisk}
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title">
          {filtered.length} {filtered.length === 1 ? "scan" : "scans"} shown
        </h2>
        <Link
          href="/archive"
          className="inline-flex items-center gap-1 text-base font-medium hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Open saved scans
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <p className="text-base" style={{ color: "var(--text-muted)" }}>
          Loading scans…
        </p>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center px-8 py-14 text-center">
          <Scan className="mb-4 h-14 w-14" style={{ color: "var(--text-muted)" }} />
          <p className="text-xl font-semibold">
            {studies.length === 0 ? "No scans yet" : "No scans match your search"}
          </p>
          <p className="mt-3 max-w-md text-base" style={{ color: "var(--text-secondary)" }}>
            {studies.length === 0
              ? "Start by uploading a patient image. The system will analyze it and save the report."
              : "Try a different name, or clear the filters above."}
          </p>
          {studies.length === 0 && (
            <Link href="/upload" className="btn-primary mt-8">
              <Upload className="h-5 w-5" />
              Upload first image
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <StudyCard key={s.id} study={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}
