"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Brain, Loader2, MessageSquare, FileText, ArrowLeftRight } from "lucide-react";
import { api } from "@/lib/api";
import type { Study } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { canAnalyze } from "@/lib/auth";
import { DicomViewer } from "@/components/DicomViewer";
import { ReportPanel } from "@/components/ReportPanel";
import { AIAssistant } from "@/components/AIAssistant";
import { RiskBadge } from "@/components/RiskBadge";

type BottomPanel = "report" | "assistant";

export default function ViewerPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = Number(params.id);
  const [study, setStudy] = useState<Study | null>(null);
  const [allStudies, setAllStudies] = useState<Study[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>("report");

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getStudy(id), api.getStudies()])
      .then(([s, all]) => {
        setStudy(s);
        setAllStudies(all);
      })
      .catch(() => setError("Study not found"));
  }, [id]);

  async function runAnalysis() {
    if (!study) return;
    setAnalyzing(true);
    try {
      const { study: updated } = await api.analyze(study.id);
      setStudy(updated);
      setBottomPanel("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  if (error && !study) {
    return (
      <div className="p-10 text-center">
        <p className="text-lg font-medium" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-3" style={{ color: "var(--text-secondary)" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--primary)" }} />
        <span>Loading study…</span>
      </div>
    );
  }

  const relatedStudies = allStudies.filter(
    (s) => s.patient.patient_id === study.patient.patient_id && s.id !== study.id
  );

  return (
    <div className="min-h-[calc(100vh-57px)] bg-[var(--bg)]">
      <header className="panel-header sticky top-0 z-30 border-b border-[var(--border)] px-4 py-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <nav className="mb-0.5 text-sm" aria-label="Breadcrumb">
              <Link href="/" className="hover:underline" style={{ color: "var(--ai)" }}>
                Worklist
              </Link>
              <span style={{ color: "var(--text-muted)" }}> / </span>
              <span>{study.patient.name}</span>
            </nav>
            <h1 className="truncate text-xl font-semibold">
              {study.modality} — {study.body_part}
            </h1>
            <p className="text-xs text-muted">
              {study.patient.patient_id}
              {study.patient.age ? ` · ${study.patient.age}y` : ""}
              {study.patient.sex ? ` · ${study.patient.sex}` : ""}
              {study.description ? ` · ${study.description}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {study.report && (
              <RiskBadge level={study.report.risk_level} score={study.report.risk_score} size="lg" />
            )}
            {relatedStudies.length > 0 && (
              <Link
                href={`/compare?a=${study.id}&b=${relatedStudies[0]?.id ?? study.id}`}
                className="btn-secondary"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Compare
              </Link>
            )}
            {!study.report && user && canAnalyze(user.role) && (
              <button type="button" onClick={runAnalysis} disabled={analyzing} className="btn-primary">
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                {analyzing ? "Analyzing…" : "Run analysis"}
              </button>
            )}
            {study.archived && <span className="status-pill">Saved to archive</span>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-4 p-4 pb-10">
        <DicomViewer study={study} />

        <section className="space-y-3">
          <div
            className="flex gap-1 p-1"
            style={{ background: "var(--surface-muted)", borderRadius: "var(--radius-md)" }}
          >
            <button
              type="button"
              onClick={() => setBottomPanel("report")}
              className={`tab-btn flex flex-1 items-center justify-center gap-2 ${
                bottomPanel === "report" ? "tab-btn-active" : "tab-btn-inactive"
              }`}
            >
              <FileText className="h-4 w-4" />
              Report
            </button>
            <button
              type="button"
              onClick={() => setBottomPanel("assistant")}
              className={`tab-btn flex flex-1 items-center justify-center gap-2 ${
                bottomPanel === "assistant" ? "tab-btn-active" : "tab-btn-inactive"
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              Ask questions
            </button>
          </div>

          {bottomPanel === "report" ? (
            <ReportPanel study={study} onReportUpdated={setStudy} />
          ) : (
            <AIAssistant study={study} />
          )}
        </section>
      </div>
    </div>
  );
}
