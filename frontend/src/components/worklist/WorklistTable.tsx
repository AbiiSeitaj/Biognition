"use client";

import { useRouter } from "next/navigation";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import type { Study } from "@/lib/types";
import {
  filterWorklistStudies,
  formatWorklistTimestamp,
  getStudyStatus,
  sortStudiesByRisk,
  statusLabel,
  type ModalityFilter,
  type StatusFilter,
} from "@/lib/studyWorklist";
import { ModalityBadge, RiskBadge, StudyStatusBadge } from "@/components/clinical/ClinicalBadges";

interface WorklistTableProps {
  studies: Study[];
  modality: ModalityFilter;
  status: StatusFilter;
}

export function WorklistTable({ studies, modality, status }: WorklistTableProps) {
  const router = useRouter();

  const rows = sortStudiesByRisk(filterWorklistStudies(studies, modality, status));

  if (rows.length === 0) {
    const emptyMsg =
      studies.length === 0
        ? "No studies uploaded yet — upload a scan to begin."
        : "No studies match the current filters — change modality or status.";
    return (
      <div className="panel flex min-h-[200px] items-center justify-center p-8 text-center">
        <p className="max-w-md text-xs text-muted">{emptyMsg}</p>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="worklist-head">
        <span />
        <span>Patient</span>
        <span>Mod</span>
        <span>Body part</span>
        <span>Uploaded</span>
        <span>Risk</span>
        <span>Status</span>
      </div>

      <div role="list">
        {rows.map((study) => {
          const st = getStudyStatus(study);
          return (
            <div
              key={study.id}
              role="listitem"
              className="worklist-row"
              onClick={() => router.push(`/viewer/${study.id}`)}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/viewer/${study.id}`)}
              tabIndex={0}
            >
              <div className="thumb-cell">
                <AuthenticatedImage studyId={study.id} alt="" className="h-full w-full object-cover" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{study.patient.name}</p>
                <p className="truncate font-mono text-[10px] text-muted">{study.patient.patient_id}</p>
              </div>

              <div>
                <ModalityBadge modality={study.modality} />
              </div>

              <div className="truncate text-xs text-muted">{study.body_part}</div>

              <div className="font-mono text-[10px] text-muted">
                {formatWorklistTimestamp(study.uploaded_at)}
              </div>

              <div>
                {study.report ? (
                  <RiskBadge
                    level={study.report.risk_level}
                    score={study.report.risk_score}
                    showAiTag
                  />
                ) : (
                  <span className="font-mono text-[10px] text-muted">—</span>
                )}
              </div>

              <div>
                <StudyStatusBadge status={statusLabel(st)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
