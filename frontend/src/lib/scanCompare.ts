import type { Study } from "./types";
import { hasTextDiff } from "./reportDiff";

export interface PatientOption {
  patientId: string;
  name: string;
  studies: Study[];
}

export function groupStudiesByPatient(studies: Study[]): PatientOption[] {
  const map = new Map<string, PatientOption>();

  for (const study of studies) {
    const key = study.patient.patient_id;
    if (!map.has(key)) {
      map.set(key, { patientId: key, name: study.patient.name, studies: [] });
    }
    map.get(key)!.studies.push(study);
  }

  return Array.from(map.values())
    .map((patient) => ({
      ...patient,
      studies: [...patient.studies].sort(
        (a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function formatStudyOption(study: Study): string {
  const date = new Date(study.uploaded_at).toLocaleDateString();
  const reportNote = study.report ? "report ready" : "no report";
  return `#${study.id} · ${study.modality} · ${study.body_part || study.description || "General"} · ${date} · ${reportNote}`;
}

export function buildScanDiffSummary(studyA: Study, studyB: Study): string[] {
  const lines: string[] = [];

  if (!studyA.report || !studyB.report) {
    return ["One or both selected scans do not have an analyzed report yet."];
  }

  const reportA = studyA.report;
  const reportB = studyB.report;

  if (reportA.risk_level !== reportB.risk_level) {
    lines.push(`Risk level changed from ${reportA.risk_level} to ${reportB.risk_level}.`);
  } else {
    lines.push(`Risk level remains ${reportA.risk_level}.`);
  }

  const riskDelta = reportB.risk_score - reportA.risk_score;
  if (Math.abs(riskDelta) >= 0.005) {
    const pct = Math.round(riskDelta * 100);
    lines.push(
      `Risk score ${pct > 0 ? "increased" : "decreased"} by ${Math.abs(pct)} percentage points (${Math.round(reportA.risk_score * 100)}% → ${Math.round(reportB.risk_score * 100)}%).`
    );
  }

  if (studyA.modality !== studyB.modality) {
    lines.push(`Scan modality differs (${studyA.modality} vs ${studyB.modality}).`);
  }

  if ((studyA.body_part || studyA.description) !== (studyB.body_part || studyB.description)) {
    lines.push(
      `Anatomical focus differs (${studyA.body_part || studyA.description || "unspecified"} vs ${studyB.body_part || studyB.description || "unspecified"}).`
    );
  }

  const sections: Array<[string, string, string]> = [
    ["Findings", reportA.findings, reportB.findings],
    ["Impression", reportA.impression, reportB.impression],
    ["Recommendations", reportA.recommendations, reportB.recommendations],
  ];

  for (const [label, left, right] of sections) {
    if (hasTextDiff(left, right)) {
      lines.push(`${label} text changed between scan A and scan B.`);
    }
  }

  if (lines.length <= 2 && !sections.some(([, left, right]) => hasTextDiff(left, right))) {
    lines.push("Report wording is largely unchanged between the two scans.");
  }

  return lines;
}
