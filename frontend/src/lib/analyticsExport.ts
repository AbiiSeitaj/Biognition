import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportComparison } from "./types";
import { hasTextDiff } from "./reportDiff";

export interface EditAnalyticsSummary {
  total: number;
  edited: number;
  unchanged: number;
  editRatePct: number;
  sectionChanges: {
    findings: number;
    impression: number;
    recommendations: number;
    riskLevel: number;
  };
  mostEditedSection: string;
  modalities: Array<{
    modality: string;
    total: number;
    edited: number;
    editRatePct: number;
  }>;
  riskLevelChanges: number;
  editedCases: Array<{
    studyId: number;
    patient: string;
    modality: string;
    sections: string[];
  }>;
  generatedAt: string;
}

export function computeEditAnalytics(comparisons: ReportComparison[]): EditAnalyticsSummary {
  const editedList = comparisons.filter((c) => c.edited);
  const unchanged = comparisons.length - editedList.length;

  const sectionChanges = {
    findings: 0,
    impression: 0,
    recommendations: 0,
    riskLevel: 0,
  };

  const modalityMap: Record<string, { total: number; edited: number }> = {};
  const editedCases: EditAnalyticsSummary["editedCases"] = [];

  for (const c of comparisons) {
    modalityMap[c.modality] = modalityMap[c.modality] || { total: 0, edited: 0 };
    modalityMap[c.modality].total += 1;
    if (c.edited) modalityMap[c.modality].edited += 1;
  }

  for (const c of editedList) {
    const sections: string[] = [];
    if (hasTextDiff(c.ai_findings, c.radiologist_findings)) {
      sectionChanges.findings += 1;
      sections.push("Findings");
    }
    if (hasTextDiff(c.ai_impression, c.radiologist_impression)) {
      sectionChanges.impression += 1;
      sections.push("Impression");
    }
    if (hasTextDiff(c.ai_recommendations, c.radiologist_recommendations)) {
      sectionChanges.recommendations += 1;
      sections.push("Recommendations");
    }
    if (c.ai_risk_level !== c.radiologist_risk_level) {
      sectionChanges.riskLevel += 1;
      sections.push("Risk level");
    }
    editedCases.push({
      studyId: c.study_id,
      patient: c.patient_name,
      modality: c.modality,
      sections,
    });
  }

  const sectionEntries = [
    ["Findings", sectionChanges.findings],
    ["Impression", sectionChanges.impression],
    ["Recommendations", sectionChanges.recommendations],
    ["Risk level", sectionChanges.riskLevel],
  ] as const;
  const top = sectionEntries.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  const mostEditedSection = top[1] > 0 ? top[0] : "None";

  const modalities = Object.entries(modalityMap)
    .map(([modality, v]) => ({
      modality,
      total: v.total,
      edited: v.edited,
      editRatePct: v.total ? Math.round((v.edited / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.edited - a.edited || b.total - a.total);

  return {
    total: comparisons.length,
    edited: editedList.length,
    unchanged,
    editRatePct: comparisons.length ? Math.round((editedList.length / comparisons.length) * 100) : 0,
    sectionChanges,
    mostEditedSection,
    modalities,
    riskLevelChanges: sectionChanges.riskLevel,
    editedCases,
    generatedAt: new Date().toLocaleString(),
  };
}

function addSectionHeading(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text(title.toUpperCase(), 14, y);
  doc.setFont("helvetica", "normal");
  return y + 6;
}

function buildAnalyticsPdf(stats: EditAnalyticsSummary): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text("AI vs Radiologist Report Analytics", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated ${stats.generatedAt} · Dr Scan PACS`, 14, 25);

  autoTable(doc, {
    startY: 32,
    theme: "grid",
    headStyles: { fillColor: [244, 244, 244], textColor: [30, 30, 30], fontStyle: "bold" },
    bodyStyles: { textColor: [30, 30, 30] },
    head: [["Metric", "Value"]],
    body: [
      ["Reports compared", String(stats.total)],
      ["Edited by radiologist", `${stats.edited} (${stats.editRatePct}%)`],
      ["Accepted unchanged", String(stats.unchanged)],
      ["Most edited section", stats.mostEditedSection],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  });

  let y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 70;
  y = addSectionHeading(doc, "Section edit frequency", y + 10);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [244, 244, 244], textColor: [30, 30, 30], fontStyle: "bold" },
    head: [["Section", "Times edited"]],
    body: [
      ["Findings", String(stats.sectionChanges.findings)],
      ["Impression", String(stats.sectionChanges.impression)],
      ["Recommendations", String(stats.sectionChanges.recommendations)],
      ["Risk level", String(stats.sectionChanges.riskLevel)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
  y = addSectionHeading(doc, "Scan modality breakdown", y + 10);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [244, 244, 244], textColor: [30, 30, 30], fontStyle: "bold" },
    head: [["Modality", "Total reports", "Edited", "Edit rate"]],
    body:
      stats.modalities.length > 0
        ? stats.modalities.map((m) => [
            m.modality,
            String(m.total),
            String(m.edited),
            `${m.editRatePct}%`,
          ])
        : [["No data", "—", "—", "—"]],
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
  y = addSectionHeading(doc, "Edited cases", y + 10);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [244, 244, 244], textColor: [30, 30, 30], fontStyle: "bold" },
    head: [["Study", "Patient", "Modality", "Sections changed"]],
    body:
      stats.editedCases.length > 0
        ? stats.editedCases.slice(0, 40).map((c) => [
            `#${c.studyId}`,
            c.patient,
            c.modality,
            c.sections.join(", ") || "—",
          ])
        : [["—", "No edited cases", "—", "—"]],
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 45 },
      2: { cellWidth: 28 },
      3: { cellWidth: "auto" },
    },
    margin: { left: 14, right: 14 },
  });

  return doc;
}

export function exportEditAnalyticsPdf(comparisons: ReportComparison[]): void {
  const stats = computeEditAnalytics(comparisons);
  const doc = buildAnalyticsPdf(stats);
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`dr-scan-analytics-${stamp}.pdf`);
}
