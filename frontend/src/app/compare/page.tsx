"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeftRight, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import type { CompareResult, Study } from "@/lib/types";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { RiskBadge } from "@/components/RiskBadge";

function CompareContent() {
  const searchParams = useSearchParams();
  const a = Number(searchParams.get("a"));
  const b = Number(searchParams.get("b"));
  const [studies, setStudies] = useState<Study[]>([]);
  const [meta, setMeta] = useState<{ same_patient: boolean; risk_delta: number | null } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!a || !b) {
      api.getStudies().then((all) => {
        setStudies(all.slice(0, 2));
        setLoading(false);
      });
      return;
    }
    api
      .compareStudies(a, b)
      .then((r: CompareResult) => {
        setStudies(r.studies);
        setMeta({ same_patient: r.same_patient, risk_delta: r.risk_delta });
      })
      .catch(() => setError("Could not load comparison"))
      .finally(() => setLoading(false));
  }, [a, b]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--primary)" }} />
        Loading comparison…
      </div>
    );
  }

  if (error) {
    return <p className="p-10 text-center" style={{ color: "var(--danger)" }}>{error}</p>;
  }

  const pair = studies.length >= 2 ? [studies[0], studies[1]] : studies;

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <header className="page-header mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ArrowLeftRight className="h-8 w-8" style={{ color: "var(--primary)" }} />
            Compare scans
          </h1>
          <p className="page-subtitle">
            Side-by-side review for the same patient or follow-up visits.
          </p>
        </div>
        {meta && (
          <div className="flex flex-wrap items-center gap-3">
            {meta.same_patient && (
              <span className="status-pill">Same patient</span>
            )}
            {meta.risk_delta !== null && (
              <span
                className="inline-flex items-center gap-1 px-3 py-1 text-base font-semibold"
                style={{
                  background: "var(--surface-muted)",
                  borderRadius: "var(--radius-md)",
                  color: meta.risk_delta > 0 ? "var(--danger)" : "var(--success)",
                }}
              >
                {meta.risk_delta > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                Risk change {meta.risk_delta > 0 ? "+" : ""}
                {Math.round(meta.risk_delta * 100)}%
              </span>
            )}
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {pair.map((study) => (
          <CompareColumn key={study.id} study={study} />
        ))}
      </div>

      {pair.length < 2 && (
        <p className="mt-8 text-center text-base" style={{ color: "var(--text-muted)" }}>
          Add ?a=1&amp;b=2 to the URL to compare specific studies.
        </p>
      )}
    </div>
  );
}

function CompareColumn({ study }: { study: Study }) {
  return (
    <article className="card overflow-hidden">
      <div className="panel-header flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div>
          <p className="text-lg font-semibold">{study.patient.name}</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {study.modality} · {study.body_part}
          </p>
        </div>
        {study.report && (
          <RiskBadge level={study.report.risk_level} score={study.report.risk_score} size="md" />
        )}
      </div>

      <div
        className="relative aspect-square"
        style={{ background: "#000", borderBottom: "1px solid var(--border)" }}
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

      <div className="space-y-3 p-4 text-sm">
        <p>
          <span className="font-semibold">Uploaded:</span>{" "}
          {new Date(study.uploaded_at).toLocaleString()}
        </p>
        {study.report ? (
          <>
            <p className="line-clamp-3">{study.report.impression}</p>
            {study.report.anomalies.slice(0, 2).map((a, i) => (
              <p key={i}>
                <span className="font-semibold">{a.label}:</span>{" "}
                {Math.round(a.confidence * 100)}% confidence
              </p>
            ))}
          </>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>Not yet analyzed</p>
        )}
        <Link href={`/viewer/${study.id}`} className="btn-primary inline-flex w-full justify-center">
          Open full viewer
        </Link>
      </div>
    </article>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20" style={{ color: "var(--text-muted)" }}>
          Loading…
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
