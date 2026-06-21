"use client";

import Link from "next/link";
import { ArrowRight, Brain, Calendar } from "lucide-react";
import type { Study } from "@/lib/types";
import { AuthenticatedImage } from "./AuthenticatedImage";
import { RiskBadge } from "./RiskBadge";

export function StudyCard({ study }: { study: Study }) {
  return (
    <div className="card-hover overflow-hidden">
      <div className="relative aspect-[4/3] bg-[var(--viewer-bg)]">
        <AuthenticatedImage
          studyId={study.id}
          alt={`Scan for ${study.patient.name}`}
          className="h-full w-full object-contain p-2"
        />
        <div className="absolute left-3 top-3">
          <span className="badge-modality">{study.modality}</span>
        </div>
        {study.report && (
          <div className="absolute right-3 top-3">
            <RiskBadge level={study.report.risk_level} score={study.report.risk_score} size="md" />
          </div>
        )}
        {study.archived && (
          <div
            className="absolute bottom-3 left-3 px-2.5 py-1 text-sm font-semibold"
            style={{
              background: "var(--ok)",
              color: "#fff",
              borderRadius: "var(--radius-sm)",
            }}
          >
            Saved
          </div>
        )}
      </div>
      <div className="p-5">
        <p className="truncate text-lg font-semibold">{study.patient.name}</p>
        <p className="mt-1 truncate text-base" style={{ color: "var(--text-secondary)" }}>
          {study.description || study.body_part}
        </p>
        <p className="mt-2 flex items-center gap-2 text-base" style={{ color: "var(--text-muted)" }}>
          <Calendar className="h-4 w-4" />
          {new Date(study.uploaded_at).toLocaleDateString()}
        </p>
        <Link href={`/viewer/${study.id}`} className="btn-primary mt-4 w-full">
          Open scan and report
          <ArrowRight className="h-5 w-5" />
        </Link>
        {!study.report && (
          <p
            className="mt-3 flex items-center justify-center gap-2 text-base font-medium"
            style={{ color: "var(--warn)" }}
          >
            <Brain className="h-4 w-4" />
            Analysis not run yet
          </p>
        )}
      </div>
    </div>
  );
}
