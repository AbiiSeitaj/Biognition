"use client";

import { useEffect, useState } from "react";
import type { Report, Study } from "@/lib/types";
import { CheckCircle2, Loader2, Pencil, Printer, Stethoscope, X } from "lucide-react";
import clsx from "clsx";
import { PathologyChart } from "@/components/PathologyChart";
import { AiInlineDiff } from "@/components/clinical/AiInlineDiff";
import { RiskBadge } from "@/components/clinical/ClinicalBadges";
import { useAuth } from "@/context/AuthContext";
import { canApproveReport, canEditReport } from "@/lib/auth";
import { api } from "@/lib/api";
import { ensureAiBaseline, stripRoutingPrefix as stripRouting, type AiBaseline } from "@/lib/aiBaseline";

type RiskLevel = Report["risk_level"];

interface ReportDraft {
  findings: string;
  impression: string;
  recommendations: string;
  risk_level: RiskLevel;
}

const FINDINGS_PLACEHOLDER = `LUNGS:
Both lung fields are adequately inflated. No focal consolidation identified.

PLEURA:
No pleural effusion or pneumothorax.

HEART:
Cardiac silhouette within normal limits.

*IMPRESSION: NO SIGNIFICANT ABNORMALITY IDENTIFIED.`;

export function ReportPanel({
  study,
  onReportUpdated,
}: {
  study: Study;
  onReportUpdated?: (study: Study) => void;
}) {
  const { user } = useAuth();
  const report = study.report;
  const [approving, setApproving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [baseline, setBaseline] = useState<AiBaseline | null>(null);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const signedOff = report?.approved === true;
  const canEdit = user ? canEditReport(user.role) : false;
  const canApprove = user ? canApproveReport(user.role) : false;

  useEffect(() => {
    if (report) {
      setBaseline(ensureAiBaseline(study.id, report));
    }
  }, [study.id, report?.id, report]);

  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setSaveError("");
  }, [study.id, report?.id]);

  function buildDraft(source: Report): ReportDraft {
    return {
      findings: source.findings,
      impression: stripRouting(source.impression),
      recommendations: source.recommendations,
      risk_level: source.risk_level,
    };
  }

  function startEditing() {
    if (!report) return;
    setDraft(buildDraft(report));
    setEditing(true);
    setSaveError("");
  }

  function cancelEditing() {
    setEditing(false);
    setDraft(null);
    setSaveError("");
  }

  async function saveEdits() {
    if (!draft || !report) return;
    setSaving(true);
    setSaveError("");
    try {
      const updated = await api.updateReport(study.id, {
        findings: draft.findings,
        impression: draft.impression,
        recommendations: draft.recommendations,
        risk_level: draft.risk_level,
      });
      onReportUpdated?.(updated);
      setEditing(false);
      setDraft(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save report");
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleApprove() {
    setApproving(true);
    setSaveError("");
    try {
      const updated = await api.approveReport(study.id);
      onReportUpdated?.(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not approve report");
    } finally {
      setApproving(false);
    }
  }

  if (!report) {
    return (
      <div className="card flex flex-col items-center justify-center p-10 text-center">
        <Stethoscope className="mb-4 h-12 w-12" style={{ color: "var(--text-muted)" }} />
        <p className="text-lg font-semibold">No report yet</p>
        <p className="mt-2 max-w-xs text-sm" style={{ color: "var(--text-secondary)" }}>
          Run AI analysis to generate a structured diagnostic report for this study.
        </p>
      </div>
    );
  }

  const reportDate = new Date(report.analyzed_at);
  const uploadDate = new Date(study.uploaded_at);
  const reportId = `RE${String(study.id).padStart(4, "0")}`;
  const examTitle = buildExamTitle(study.modality, study.body_part, study.description);
  const displayFindings = editing && draft ? draft.findings : report.findings;
  const displayImpression = editing && draft ? draft.impression : stripRouting(report.impression);
  const displayRecommendations = editing && draft ? draft.recommendations : report.recommendations;
  const displayRiskLevel = editing && draft ? draft.risk_level : report.risk_level;
  const displayRiskPct = Math.round(report.risk_score * 100);
  const humanEdited = isHumanEdited(report);
  const reportStatus = signedOff ? "Approved" : humanEdited ? "Amended" : "Draft";

  return (
    <div className="flex flex-col gap-3">
      <div className="report-actions sticky top-[57px] z-20 flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 print:hidden">
        {!editing ? (
          <>
            {canEdit && (
              <button type="button" onClick={startEditing} className="btn-primary min-w-[140px]">
                <Pencil className="h-4 w-4" />
                Edit report
              </button>
            )}
            {!canEdit && (
              <p className="self-center text-xs text-muted">Radiologist login required to edit reports.</p>
            )}
            <button type="button" onClick={handlePrint} className="btn-secondary">
              <Printer className="h-4 w-4" />
              Print / PDF
            </button>
            {canApprove && !signedOff ? (
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="btn-secondary"
              >
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve & deliver
              </button>
            ) : signedOff ? (
              <span className="status-badge status-approved inline-flex">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approved{report.approved_by ? ` · ${report.approved_by}` : ""}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <button type="button" onClick={saveEdits} disabled={saving} className="btn-primary min-w-[140px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save changes
            </button>
            <button type="button" onClick={cancelEditing} disabled={saving} className="btn-secondary">
              <X className="h-4 w-4" />
              Cancel
            </button>
            <p className="w-full text-xs text-muted">
              Edit each anatomical region (e.g. LUNGS, PLEURA, HEART). Saved changes are compared with the original AI
              report on the Analytics dashboard.
            </p>
          </>
        )}
      </div>

      {saveError && (
        <p className="text-xs print:hidden" style={{ color: "var(--danger)" }}>
          Save failed — {saveError}. Check the connection and try again.
        </p>
      )}

      {!editing && report.anomalies.length > 0 && (
        <div className="print:hidden">
          <PathologyChart anomalies={report.anomalies} />
        </div>
      )}

      <article className="report-print-root card flex flex-col">
        <header className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide">Radiology report</h2>
              <p className="text-xs text-muted">
                {humanEdited ? "Amended by radiologist" : "AI-assisted draft — requires radiologist verification"}
              </p>
            </div>
            <div className="text-right font-mono text-xs text-muted">
              <div>#{reportId}</div>
              <div>{reportStatus}</div>
            </div>
          </div>
        </header>

        <section className="border-b border-[var(--border)] px-5 py-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Field label="Name" value={study.patient.name} />
            <Field label="Report Date" value={formatDateTime(reportDate)} />
            <Field
              label="Age / Gender"
              value={`${study.patient.age ?? "—"} Year / ${formatSex(study.patient.sex)}`}
            />
            <Field label="Registration Date" value={formatDateTime(uploadDate)} />
            <Field label="Patient ID" value={study.patient.patient_id} />
            <Field label="Report ID" value={reportId} />
            <Field label="Modality" value={study.modality} />
            <Field label="Report Status" value={reportStatus} />
            <Field label="Body Part" value={study.body_part} />
            <Field label="Study UID" value={study.study_uid.slice(-12)} mono />
          </div>
        </section>

        <section className="mx-5 my-4 border border-[var(--border)] p-3 print:hidden" style={{ borderRadius: "var(--radius-md)" }}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {editing ? "Risk level" : "AI risk score (internal)"}
            </p>
            <div className="text-right">
              {!editing && (
                <p
                  className="font-mono text-lg tabular-nums"
                  style={{
                    color:
                      displayRiskLevel === "high" || displayRiskLevel === "critical"
                        ? "var(--danger)"
                        : "var(--text)",
                  }}
                >
                  {displayRiskPct}%
                </p>
              )}
              {editing && draft ? (
                <select
                  value={draft.risk_level}
                  onChange={(e) => setDraft({ ...draft, risk_level: e.target.value as RiskLevel })}
                  className="select-field capitalize"
                >
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              ) : baseline ? (
                <AiInlineDiff aiValue={baseline.risk_level} currentValue={displayRiskLevel} mono />
              ) : (
                <RiskBadge level={displayRiskLevel} score={report.risk_score} showAiTag />
              )}
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--border)] px-5 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Examination</p>
          <p className="mt-1 text-sm font-semibold uppercase">{examTitle}</p>
        </section>

        <section className="space-y-5 px-5 py-5 text-sm leading-relaxed">
          <ReportBlock title="Findings">
            {editing && draft ? (
              <textarea
                value={draft.findings}
                onChange={(e) => setDraft({ ...draft, findings: e.target.value })}
                className="input-field min-h-[280px] w-full font-mono text-sm leading-relaxed"
                placeholder={FINDINGS_PLACEHOLDER}
              />
            ) : baseline && humanEdited ? (
              <AnatomicalFindingsText text={displayFindings} />
            ) : (
              <AnatomicalFindingsText text={displayFindings} />
            )}
          </ReportBlock>

          <ReportBlock title="Impression">
            {editing && draft ? (
              <textarea
                value={draft.impression}
                onChange={(e) => setDraft({ ...draft, impression: e.target.value })}
                className="input-field min-h-[80px] w-full leading-relaxed"
                placeholder="*IMPRESSION: NO SIGNIFICANT ABNORMALITY IDENTIFIED."
              />
            ) : baseline && humanEdited ? (
              <p className="whitespace-pre-wrap font-semibold">
                <AiInlineDiff aiValue={baseline.impression} currentValue={displayImpression} mono={false} />
              </p>
            ) : (
              <p className="whitespace-pre-wrap font-semibold">{displayImpression}</p>
            )}
          </ReportBlock>

          <ReportBlock title="Recommendations">
            {editing && draft ? (
              <textarea
                value={draft.recommendations}
                onChange={(e) => setDraft({ ...draft, recommendations: e.target.value })}
                className="input-field min-h-[72px] w-full leading-relaxed"
                placeholder="Clinical follow-up recommendations"
              />
            ) : baseline && humanEdited ? (
              <p className="whitespace-pre-wrap">
                <AiInlineDiff
                  aiValue={baseline.recommendations}
                  currentValue={displayRecommendations}
                  mono={false}
                />
              </p>
            ) : (
              <p className="whitespace-pre-wrap">{displayRecommendations}</p>
            )}
          </ReportBlock>

          <p className="border-t border-[var(--border)] pt-4 text-center text-sm italic text-muted">
            — End of report —
          </p>
        </section>

        <footer className="border-t border-[var(--border)] px-5 py-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-serif text-lg" style={{ fontFamily: "var(--font-brand)" }}>
                Dr Scan Radiology
              </p>
              <p className="text-xs text-muted">
                {signedOff
                  ? `Signed off${report.approved_by ? ` by ${report.approved_by}` : ""}`
                  : "Pending radiologist verification"}
              </p>
            </div>
            <div className="text-right text-xs text-muted">Generated {formatDateTime(reportDate)}</div>
          </div>
        </footer>
      </article>
    </div>
  );
}

function AnatomicalFindingsText({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="space-y-4">
      {blocks.map((block, idx) => {
        const lines = block.split("\n");
        const header = lines[0]?.trim();
        const body = lines.slice(1).join("\n").trim();
        const isRegion = header?.endsWith(":") && header === header.toUpperCase();
        if (isRegion) {
          return (
            <div key={idx}>
              <p className="mb-1 text-sm font-bold tracking-wide">{header.replace(/:$/, "")}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{body || "—"}</p>
            </div>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-wrap text-sm leading-relaxed">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function isHumanEdited(report: Report): boolean {
  if (!report.ai_findings) return false;
  const aiImp = stripRouting(report.ai_impression ?? report.impression);
  const curImp = stripRouting(report.impression);
  return (
    report.findings.trim() !== report.ai_findings.trim() ||
    curImp.trim() !== aiImp.trim() ||
    report.recommendations.trim() !== (report.ai_recommendations ?? report.recommendations).trim() ||
    Boolean(report.ai_risk_level && report.risk_level !== report.ai_risk_level)
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-1">
      <span className="shrink-0 font-semibold text-muted">{label}:</span>
      <span className={clsx("truncate", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function ReportBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4
        className="mb-2 border-b pb-1.5 text-sm font-bold uppercase tracking-wider"
        style={{ borderColor: "var(--border)", color: "var(--primary)" }}
      >
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
