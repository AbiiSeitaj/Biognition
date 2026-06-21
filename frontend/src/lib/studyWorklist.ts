import type { Study } from "./types";

export type StudyStatus = "pending" | "analyzed" | "approved" | "archived";

export type ModalityFilter = "ALL" | "XR" | "CT" | "MR" | "US";
export type StatusFilter = "ALL" | StudyStatus;

const RISK_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
};

export function isStudyApproved(study: Study): boolean {
  return study.report?.approved === true;
}

export function getStudyStatus(study: Study): StudyStatus {
  if (study.archived) return "archived";
  if (isStudyApproved(study)) return "approved";
  if (study.report) return "analyzed";
  return "pending";
}

export function statusLabel(status: StudyStatus): string {
  switch (status) {
    case "pending":
      return "Pending Analysis";
    case "analyzed":
      return "Analyzed";
    case "approved":
      return "Approved";
    case "archived":
      return "Archived";
  }
}

export function sortStudiesByRisk(studies: Study[]): Study[] {
  return [...studies].sort((a, b) => {
    const aLevel = a.report?.risk_level ?? "pending";
    const bLevel = b.report?.risk_level ?? "pending";
    const aOrder = a.report ? (RISK_ORDER[aLevel] ?? 4) : 5;
    const bOrder = b.report ? (RISK_ORDER[bLevel] ?? 4) : 5;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aScore = a.report?.risk_score ?? 0;
    const bScore = b.report?.risk_score ?? 0;
    if (aScore !== bScore) return bScore - aScore;
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  });
}

export function filterWorklistStudies(
  studies: Study[],
  modality: ModalityFilter,
  status: StatusFilter
): Study[] {
  return studies.filter((s) => {
    if (modality !== "ALL" && s.modality !== modality) return false;
    if (status === "ALL") return true;
    return getStudyStatus(s) === status;
  });
}

export function formatWorklistTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
