import type { Study } from "@/lib/types";
import { AlertTriangle, Stethoscope } from "lucide-react";
import clsx from "clsx";

export function ReportPanel({ study }: { study: Study }) {
  const report = study.report;

  if (!report) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <Stethoscope className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-700">No report generated yet</p>
        <p className="mt-1 text-xs text-slate-500">Run AI analysis to produce a structured diagnostic report</p>
      </div>
    );
  }

  const riskPct = Math.round(report.risk_score * 100);
  const reportDate = new Date(report.analyzed_at);
  const uploadDate = new Date(study.uploaded_at);
  const reportId = `RE${String(study.id).padStart(4, "0")}`;
  const examTitle = buildExamTitle(study.modality, study.body_part, study.description);
  const routingNote = extractRoutingNote(report.impression);

  return (
    <article className="report-document flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      {/* Letterhead */}
      <header className="border-b-2 border-[#1e3a8a] bg-gradient-to-r from-[#1e40af] to-[#2563eb] px-4 py-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">
                +
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight">Dr Scan</h2>
                <p className="text-[10px] text-blue-100">AI-Assisted Medical Imaging</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-1.5 text-right text-[10px] leading-snug">
            <div className="font-semibold">AI Radiology Report</div>
            <div className="text-blue-100">Automated Analysis System</div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Patient demographics */}
        <section className="border-b border-slate-200 px-4 py-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            <Field label="Name" value={study.patient.name} />
            <Field
              label="Report Date"
              value={formatDateTime(reportDate)}
            />
            <Field
              label="Age / Gender"
              value={`${study.patient.age ?? "—"} Year / ${formatSex(study.patient.sex)}`}
            />
            <Field label="Registration Date" value={formatDateTime(uploadDate)} />
            <Field label="Patient ID" value={study.patient.patient_id} />
            <Field label="Report ID" value={reportId} />
            <Field label="Modality" value={study.modality} />
            <Field label="Report Status" value="Final" />
            <Field label="Body Part" value={study.body_part} />
            <Field label="Study UID" value={study.study_uid.slice(-12)} mono />
          </div>
        </section>

        {/* Risk score — prominent */}
        <section
          className={clsx(
            "mx-4 my-3 rounded-lg border-2 px-4 py-3",
            riskStyles(report.risk_level).box
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                AI Risk Assessment
              </p>
              <p className="mt-0.5 text-[11px] text-slate-600">
                Composite score from detected findings and severity weighting
              </p>
            </div>
            <div className="text-right">
              <div className={clsx("text-3xl font-black tabular-nums leading-none", riskStyles(report.risk_level).score)}>
                {riskPct}%
              </div>
              <div
                className={clsx(
                  "mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wide",
                  riskStyles(report.risk_level).badge
                )}
              >
                {report.risk_level}
              </div>
            </div>
          </div>
        </section>

        {/* Exam title */}
        <section className="border-y border-slate-200 bg-slate-50 px-4 py-2.5 text-center">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#1e40af]">RADIOLOGY</p>
          <p className="mt-0.5 text-xs font-bold uppercase text-slate-800">{examTitle}</p>
        </section>

        {/* Findings body */}
        <section className="space-y-4 px-4 py-4 text-[11px] leading-relaxed text-slate-800">
          {routingNote && (
            <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] text-blue-900">
              {routingNote}
            </div>
          )}

          <ReportBlock title="Findings">
            {report.anomalies.length > 0 ? (
              <ul className="space-y-2.5">
                {report.anomalies.map((a, i) => (
                  <li key={`${a.label}-${i}`}>
                    <span className="font-bold uppercase text-slate-900">{a.label}:</span>{" "}
                    AI confidence {Math.round(a.confidence * 100)}%. Region:{" "}
                    {a.region.replace(/_/g, " ")}. Severity: {a.severity}.
                  </li>
                ))}
              </ul>
            ) : (
              <p className="whitespace-pre-wrap">{report.findings}</p>
            )}
          </ReportBlock>

          <ReportBlock title="Impression">
            <p className="whitespace-pre-wrap font-medium">{stripRoutingPrefix(report.impression)}</p>
          </ReportBlock>

          <ReportBlock title="Recommendations">
            <p
              className={clsx(
                "whitespace-pre-wrap",
                report.risk_level === "high" || report.risk_level === "critical"
                  ? "font-semibold text-red-700"
                  : report.risk_level === "moderate"
                    ? "font-medium text-amber-800"
                    : "text-slate-700"
              )}
            >
              {(report.risk_level === "high" || report.risk_level === "critical") && (
                <AlertTriangle className="mb-1 inline h-3.5 w-3.5 align-text-bottom" />
              )}{" "}
              {report.recommendations}
            </p>
          </ReportBlock>

          <p className="border-t border-slate-200 pt-3 text-center text-[10px] italic text-slate-400">
            ~~ End of report ~~
          </p>
        </section>

        {/* Signature */}
        <footer className="border-t border-slate-200 px-4 py-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-serif text-lg italic text-slate-600">Dr Scan AI</p>
              <p className="text-[10px] font-semibold text-slate-700">Automated Analysis Engine</p>
              <p className="text-[9px] text-slate-400">AI-assisted read — requires radiologist verification</p>
            </div>
            <div className="text-right text-[9px] text-slate-400">
              Report generated {formatDateTime(reportDate)}
            </div>
          </div>
        </footer>
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-1">
      <span className="shrink-0 font-semibold text-slate-500">{label}:</span>
      <span className={clsx("truncate text-slate-800", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function ReportBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 border-b border-slate-200 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#1e40af]">
        {title}
      </h4>
      {children}
    </div>
  );
}

function formatDateTime(d: Date) {
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSex(sex: string | null) {
  if (!sex) return "—";
  const s = sex.toLowerCase();
  if (s === "m" || s === "male") return "Male";
  if (s === "f" || s === "female") return "Female";
  return sex;
}

function buildExamTitle(modality: string, bodyPart: string, description: string) {
  const part = bodyPart || "General";
  if (description && description.length > 3) return description.toUpperCase();
  const map: Record<string, string> = {
    XR: `X-RAY — ${part.toUpperCase()}`,
    CT: `CT SCAN — ${part.toUpperCase()}`,
    MR: `MRI — ${part.toUpperCase()}`,
    US: `ULTRASOUND — ${part.toUpperCase()}`,
  };
  return map[modality] ?? `${modality} — ${part.toUpperCase()}`;
}

function extractRoutingNote(impression: string): string | null {
  const match = impression.match(/Stage 1 —[^\n]+(?:\n[^\n]+)?/);
  if (!match) return null;
  return match[0].trim();
}

function stripRoutingPrefix(impression: string): string {
  return impression.replace(/Stage 1 —[^\n]+\.\s*/i, "").trim();
}

function riskStyles(level: string) {
  switch (level) {
    case "critical":
      return {
        box: "border-red-400 bg-red-50",
        score: "text-red-700",
        badge: "bg-red-600 text-white",
      };
    case "high":
      return {
        box: "border-red-300 bg-red-50",
        score: "text-red-600",
        badge: "bg-red-500 text-white",
      };
    case "moderate":
      return {
        box: "border-amber-300 bg-amber-50",
        score: "text-amber-700",
        badge: "bg-amber-500 text-white",
      };
    default:
      return {
        box: "border-emerald-300 bg-emerald-50",
        score: "text-emerald-700",
        badge: "bg-emerald-600 text-white",
      };
  }
}
