"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Archive, Brain, Scan, Upload } from "lucide-react";
import { api } from "@/lib/api";
import type { Stats, Study } from "@/lib/types";
import { StudyCard } from "@/components/StudyCard";
import { RiskBadge } from "@/components/RiskBadge";

export default function DashboardPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getStudies(), api.getStats()])
      .then(([s, st]) => {
        setStudies(s);
        setStats(st);
      })
      .finally(() => setLoading(false));
  }, []);

  const highRisk = studies.filter(
    (s) => s.report && (s.report.risk_level === "high" || s.report.risk_level === "critical")
  );

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Clinical Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          AI-powered medical imaging · PACS archiving · Cross-department access
        </p>
      </header>

      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Scan} label="Total Studies" value={stats.total_studies} color="cyan" />
          <StatCard icon={Archive} label="PACS Archived" value={stats.archived_studies} color="blue" />
          <StatCard icon={AlertTriangle} label="High Risk" value={stats.high_risk_count} color="red" />
          <StatCard icon={Brain} label="Pending AI" value={stats.pending_analysis} color="amber" />
        </div>
      )}

      {highRisk.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-300">
            <AlertTriangle className="h-4 w-4" /> High-Risk Alerts
          </h2>
          <div className="space-y-2">
            {highRisk.slice(0, 3).map((s) => (
              <Link
                key={s.id}
                href={`/viewer/${s.id}`}
                className="glass-panel flex items-center justify-between p-4 transition hover:border-red-500/30"
              >
                <div>
                  <p className="text-sm font-medium text-white">{s.patient.name}</p>
                  <p className="text-xs text-slate-400">{s.description}</p>
                </div>
                {s.report && <RiskBadge level={s.report.risk_level} score={s.report.risk_score} />}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Recent Studies</h2>
        <Link
          href="/upload"
          className="flex items-center gap-1 rounded-lg bg-cyan-600/20 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-600/30"
        >
          <Upload className="h-3.5 w-3.5" /> New Upload
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading studies...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {studies.map((s) => (
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
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: "cyan" | "blue" | "red" | "amber";
}) {
  const colors = {
    cyan: "text-cyan-400 bg-cyan-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    red: "text-red-400 bg-red-500/10",
    amber: "text-amber-400 bg-amber-500/10",
  };
  return (
    <div className="glass-panel p-4">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${colors[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
