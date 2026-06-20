import type { Study } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";
import { AlertTriangle, FileText, Stethoscope } from "lucide-react";

export function ReportPanel({ study }: { study: Study }) {
  const report = study.report;

  if (!report) {
    return (
      <div className="glass-panel flex h-full flex-col items-center justify-center p-8 text-center">
        <Stethoscope className="mb-3 h-10 w-10 text-slate-600" />
        <p className="text-sm text-slate-400">No AI report yet</p>
        <p className="mt-1 text-xs text-slate-500">Run analysis to generate structured findings</p>
      </div>
    );
  }

  return (
    <div className="glass-panel flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileText className="h-4 w-4 text-cyan-400" />
            Diagnostic Report
          </h3>
          <RiskBadge level={report.risk_level} score={report.risk_score} />
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          Analyzed {new Date(report.analyzed_at).toLocaleString()}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Section title="Findings">
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300">
            {report.findings}
          </pre>
        </Section>

        <Section title="Impression">
          <p className="text-xs leading-relaxed text-slate-300">{report.impression}</p>
        </Section>

        <Section title="Recommendations">
          <p
            className={`text-xs leading-relaxed ${
              report.risk_level === "high" || report.risk_level === "critical"
                ? "text-red-300"
                : "text-slate-300"
            }`}
          >
            {(report.risk_level === "high" || report.risk_level === "critical") && (
              <AlertTriangle className="mb-1 inline h-3.5 w-3.5" />
            )}{" "}
            {report.recommendations}
          </p>
        </Section>

        {report.anomalies.length > 0 && (
          <Section title="Detected Anomalies">
            <ul className="space-y-2">
              {report.anomalies.map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs"
                >
                  <div className="flex justify-between font-medium text-white">
                    <span>{a.label}</span>
                    <span className="text-cyan-400">{Math.round(a.confidence * 100)}%</span>
                  </div>
                  <div className="mt-0.5 text-slate-500">
                    {a.region.replace(/_/g, " ")} · {a.severity}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-500/80">
        {title}
      </h4>
      {children}
    </div>
  );
}
