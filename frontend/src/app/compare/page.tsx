"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, FileDiff, Loader2, TrendingDown, TrendingUp, User } from "lucide-react";
import { api } from "@/lib/api";
import type { Study } from "@/lib/types";
import {
  buildScanDiffSummary,
  formatStudyOption,
  groupStudiesByPatient,
} from "@/lib/scanCompare";
import { diffText } from "@/lib/reportDiff";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { RiskBadge } from "@/components/RiskBadge";

function CompareContent() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patientId, setPatientId] = useState("");
  const [scanAId, setScanAId] = useState<number | "">("");
  const [scanBId, setScanBId] = useState<number | "">("");

  useEffect(() => {
    api
      .getStudies()
      .then(setStudies)
      .catch(() => setError("Could not load studies"))
      .finally(() => setLoading(false));
  }, []);

  const patients = useMemo(() => groupStudiesByPatient(studies), [studies]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.patientId === patientId) ?? null,
    [patients, patientId]
  );

  const patientStudies = selectedPatient?.studies ?? [];
  const analyzedStudies = patientStudies.filter((s) => s.report);

  const studyA = patientStudies.find((s) => s.id === scanAId) ?? null;
  const studyB = patientStudies.find((s) => s.id === scanBId) ?? null;

  const readyToCompare =
    !!studyA &&
    !!studyB &&
    studyA.id !== studyB.id &&
    !!studyA.report &&
    !!studyB.report;

  const riskDelta =
    readyToCompare && studyA.report && studyB.report
      ? studyB.report.risk_score - studyA.report.risk_score
      : null;

  const diffSummary =
    readyToCompare && studyA && studyB ? buildScanDiffSummary(studyA, studyB) : [];

  function handlePatientChange(nextPatientId: string) {
    setPatientId(nextPatientId);
    setScanAId("");
    setScanBId("");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--primary)" }} />
        Loading studies…
      </div>
    );
  }

  if (error) {
    return (
      <p className="p-10 text-center" style={{ color: "var(--danger)" }}>
        {error}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 lg:p-6">
      <header className="page-header mb-4 border-b border-[var(--border)] pb-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6" style={{ color: "var(--ai)" }} />
            Compare scans
          </h1>
          <p className="page-subtitle">
            Select a patient, choose two reports, then review side-by-side differences.
          </p>
        </div>
      </header>

      <section className="panel mb-4 space-y-4 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">1 · Select patient</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="block md:col-span-2 lg:col-span-1">
            <span className="mb-1 block text-[11px] font-medium text-muted">Patient</span>
            <select
              className="input-field w-full"
              value={patientId}
              onChange={(e) => handlePatientChange(e.target.value)}
            >
              <option value="">Choose a patient…</option>
              {patients.map((patient) => (
                <option key={patient.patientId} value={patient.patientId}>
                  {patient.name} ({patient.patientId}) · {patient.studies.length} scan
                  {patient.studies.length === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>

          {selectedPatient && (
            <div
              className="flex items-center gap-3 rounded border border-[var(--border)] px-3 py-2 md:col-span-2"
              style={{ background: "var(--surface-muted)" }}
            >
              <User className="h-4 w-4 shrink-0 text-muted" />
              <div className="min-w-0 text-xs">
                <p className="font-medium">{selectedPatient.name}</p>
                <p className="text-muted">
                  {selectedPatient.patientId} · {analyzedStudies.length} analyzed report
                  {analyzedStudies.length === 1 ? "" : "s"} of {patientStudies.length} total scan
                  {patientStudies.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          )}
        </div>

        {selectedPatient && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              2 · Select two reports
            </p>
            {analyzedStudies.length < 2 ? (
              <p className="text-sm text-muted">
                This patient needs at least two analyzed scans before comparison is available.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">Scan A (baseline)</span>
                  <select
                    className="input-field w-full"
                    value={scanAId}
                    onChange={(e) =>
                      setScanAId(e.target.value ? Number(e.target.value) : "")
                    }
                  >
                    <option value="">Choose first report…</option>
                    {analyzedStudies.map((study) => (
                      <option key={study.id} value={study.id} disabled={study.id === scanBId}>
                        {formatStudyOption(study)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">Scan B (follow-up)</span>
                  <select
                    className="input-field w-full"
                    value={scanBId}
                    onChange={(e) =>
                      setScanBId(e.target.value ? Number(e.target.value) : "")
                    }
                  >
                    <option value="">Choose second report…</option>
                    {analyzedStudies.map((study) => (
                      <option key={study.id} value={study.id} disabled={study.id === scanAId}>
                        {formatStudyOption(study)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </>
        )}

        {!patientId && (
          <p className="text-sm text-muted">Pick a patient to load their available scans.</p>
        )}
      </section>

      {!readyToCompare && selectedPatient && analyzedStudies.length >= 2 && (!scanAId || !scanBId) && (
        <p className="panel p-4 text-sm text-muted">Select scan A and scan B above to view the comparison.</p>
      )}

      {!readyToCompare && selectedPatient && scanAId && scanBId && scanAId === scanBId && (
        <p className="panel p-4 text-sm text-muted">Choose two different scans to compare.</p>
      )}

      {readyToCompare && studyA && studyB && (
        <>
          {riskDelta !== null && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="status-badge">Same patient</span>
              <span
                className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold"
                style={{
                  background: "var(--surface-muted)",
                  borderRadius: "var(--radius-md)",
                  color: riskDelta > 0 ? "var(--danger)" : riskDelta < 0 ? "var(--success)" : "var(--text)",
                }}
              >
                {riskDelta > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : riskDelta < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : null}
                Risk change {riskDelta > 0 ? "+" : ""}
                {Math.round(riskDelta * 100)}%
              </span>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <CompareColumn study={studyA!} label="Scan A" />
            <CompareColumn study={studyB!} label="Scan B" />
          </div>

          <section className="panel mt-4 p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileDiff className="h-4 w-4" style={{ color: "var(--ai)" }} />
              <h2 className="text-xs font-semibold uppercase tracking-wide">Report differences</h2>
            </div>
            <p className="mb-3 text-xs text-muted">
              Comparing scan A → scan B. Red strikethrough = removed in scan B; green = added in scan B.
            </p>

            <ul className="mb-4 space-y-1 border-b border-[var(--border)] pb-4 text-sm">
              {diffSummary.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>

            <div className="space-y-4">
              <ReportDiffBlock
                label="Findings"
                left={studyA!.report!.findings}
                right={studyB!.report!.findings}
              />
              <ReportDiffBlock
                label="Impression"
                left={studyA!.report!.impression}
                right={studyB!.report!.impression}
              />
              <ReportDiffBlock
                label="Recommendations"
                left={studyA!.report!.recommendations}
                right={studyB!.report!.recommendations}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CompareColumn({ study, label }: { study: Study; label: string }) {
  return (
    <article className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="text-sm font-semibold">{study.patient.name}</p>
          <p className="text-xs text-muted">
            #{study.id} · {study.modality} · {study.body_part || study.description}
          </p>
        </div>
        {study.report && (
          <RiskBadge level={study.report.risk_level} score={study.report.risk_score} size="sm" />
        )}
      </div>

      <div
        className="relative aspect-square"
        style={{ background: "var(--viewer-bg)", borderBottom: "1px solid var(--border)" }}
      >
        <AuthenticatedImage
          studyId={study.id}
          alt={`${study.patient.name} scan`}
          className="h-full w-full object-contain"
        />
        {study.report?.overlay_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={api.overlayUrl(study.id)}
            alt="AI heatmap overlay"
            className="absolute inset-0 h-full w-full object-contain opacity-70 mix-blend-screen"
          />
        )}
      </div>

      <div className="space-y-3 p-4 text-xs leading-relaxed">
        <p className="text-muted">Uploaded {new Date(study.uploaded_at).toLocaleString()}</p>
        {study.report ? (
          <>
            <ReportSection title="Findings" body={study.report.findings} />
            <ReportSection title="Impression" body={study.report.impression} />
            <ReportSection title="Recommendations" body={study.report.recommendations} />
          </>
        ) : (
          <p className="text-muted">Not yet analyzed</p>
        )}
        <Link href={`/viewer/${study.id}`} className="btn-secondary inline-flex w-full justify-center">
          Open full viewer
        </Link>
      </div>
    </article>
  );
}

function ReportSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <p className="whitespace-pre-wrap">{body || "—"}</p>
    </div>
  );
}

function ReportDiffBlock({ label, left, right }: { label: string; left: string; right: string }) {
  const changed = left.trim() !== right.trim();
  const segments = changed ? diffText(left, right) : [{ type: "equal" as const, text: left || "—" }];

  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      {!changed ? (
        <p className="text-sm text-muted">No change between scan A and scan B.</p>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {segments.map((seg, idx) =>
            seg.type === "delete" ? (
              <span key={idx} className="diff-deleted">
                {seg.text}
              </span>
            ) : seg.type === "insert" ? (
              <span key={idx} className="diff-inserted">
                {seg.text}
              </span>
            ) : (
              <span key={idx}>{seg.text}</span>
            )
          )}
        </p>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-muted">
          Loading…
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
