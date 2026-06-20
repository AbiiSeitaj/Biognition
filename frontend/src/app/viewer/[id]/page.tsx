"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Brain, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Study } from "@/lib/types";
import { DicomViewer } from "@/components/DicomViewer";
import { ReportPanel } from "@/components/ReportPanel";
import { RiskBadge } from "@/components/RiskBadge";

export default function ViewerPage() {
  const params = useParams();
  const id = Number(params.id);
  const [study, setStudy] = useState<Study | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.getStudy(id).then(setStudy).catch(() => setError("Study not found"));
  }, [id]);

  async function runAnalysis() {
    if (!study) return;
    setAnalyzing(true);
    try {
      const { study: updated } = await api.analyze(study.id);
      setStudy(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  if (error && !study) {
    return <div className="p-8 text-red-300">{error}</div>;
  }

  if (!study) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">{study.patient.name}</h1>
          <p className="text-xs text-slate-400">
            {study.modality} · {study.body_part} · {study.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {study.report && (
            <RiskBadge level={study.report.risk_level} score={study.report.risk_score} size="lg" />
          )}
          {!study.report && (
            <button
              type="button"
              onClick={runAnalysis}
              disabled={analyzing}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              Run AI Analysis
            </button>
          )}
          {study.archived && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
              PACS Archived
            </span>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_360px]">
        <DicomViewer study={study} />
        <ReportPanel study={study} />
      </div>
    </div>
  );
}
