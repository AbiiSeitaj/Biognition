import type { Report } from "./types";

export interface AiBaseline {
  findings: string;
  impression: string;
  recommendations: string;
  risk_level: string;
}

function key(studyId: number) {
  return `drscan-ai-baseline-${studyId}`;
}

export function stripRoutingPrefix(impression: string): string {
  return impression.replace(/Stage 1 —[^\n]+\.\s*/i, "").trim();
}

export function ensureAiBaseline(studyId: number, report: Report): AiBaseline {
  if (report.ai_findings) {
    return {
      findings: report.ai_findings,
      impression: stripRoutingPrefix(report.ai_impression ?? report.impression),
      recommendations: report.ai_recommendations ?? report.recommendations,
      risk_level: report.ai_risk_level ?? report.risk_level,
    };
  }

  if (typeof window === "undefined") {
    return snapshot(report);
  }
  const existing = localStorage.getItem(key(studyId));
  if (existing) {
    try {
      return JSON.parse(existing) as AiBaseline;
    } catch {
      /* fall through */
    }
  }
  const baseline = snapshot(report);
  localStorage.setItem(key(studyId), JSON.stringify(baseline));
  return baseline;
}

export function getAiBaseline(studyId: number): AiBaseline | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key(studyId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AiBaseline;
  } catch {
    return null;
  }
}

function snapshot(report: Report): AiBaseline {
  return {
    findings: report.findings,
    impression: stripRoutingPrefix(report.impression),
    recommendations: report.recommendations,
    risk_level: report.risk_level,
  };
}
