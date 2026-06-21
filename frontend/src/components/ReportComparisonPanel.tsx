"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Download, ExternalLink, FileDiff } from "lucide-react";
import type { ReportComparison } from "@/lib/types";
import { exportEditAnalyticsPdf } from "@/lib/analyticsExport";
import { aiDiffSegments, humanDiffSegments } from "@/lib/reportDiff";

interface ReportComparisonPanelProps {
  comparisons: ReportComparison[];
}

export function ReportComparisonPanel({ comparisons }: ReportComparisonPanelProps) {
  const edited = comparisons.filter((c) => c.edited);
  const unchanged = comparisons.filter((c) => !c.edited);

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <FileDiff className="h-4 w-4" style={{ color: "var(--ai)" }} />
            AI vs radiologist reports
          </h2>
          <p className="mt-1 text-xs text-muted">
            Side-by-side view of the original AI output and the report after human review
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-3 text-xs">
            <span>
              <strong>{edited.length}</strong> edited
            </span>
            <span className="text-muted">
              <strong>{unchanged.length}</strong> unchanged
            </span>
          </div>
          <button
            type="button"
            className="btn-secondary px-2 py-1 text-xs"
            onClick={() => exportEditAnalyticsPdf(comparisons)}
            disabled={comparisons.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      {comparisons.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No analyzed reports yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {comparisons.map((item) => (
            <ComparisonRow key={item.study_id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function ComparisonRow({ item }: { item: ReportComparison }) {
  const [open, setOpen] = useState(item.edited);

  return (
    <article
      className="border border-[var(--border)]"
      style={{ borderRadius: "var(--radius)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-muted)]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{item.patient_name}</span>
            <span className="font-mono text-[10px] text-muted">#{item.study_id}</span>
            <span className="text-[10px] uppercase text-muted">{item.modality}</span>
            {item.edited ? (
              <span className="status-badge status-warning text-[10px]">Edited by radiologist</span>
            ) : (
              <span className="status-badge text-[10px]">AI accepted as-is</span>
            )}
            {item.approved && (
              <span className="status-badge status-approved text-[10px]">
                Approved{item.approved_by ? ` · ${item.approved_by}` : ""}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            Risk: AI {item.ai_risk_level}
            {item.ai_risk_level !== item.radiologist_risk_level
              ? ` → ${item.radiologist_risk_level}`
              : ""}
          </p>
        </div>
        <Link
          href={`/viewer/${item.study_id}`}
          onClick={(e) => e.stopPropagation()}
          className="btn-secondary shrink-0 px-2 py-1 text-xs"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </Link>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
        )}
      </button>

      {open && (
        <div className="grid gap-3 border-t border-[var(--border)] p-3 lg:grid-cols-2">
          <ReportColumn title="AI original" tone="ai" item={item} side="ai" />
          <ReportColumn
            title={item.edited ? "Radiologist version" : "Final report (unchanged)"}
            tone="human"
            item={item}
            side="human"
          />
        </div>
      )}
    </article>
  );
}

function ReportColumn({
  title,
  tone,
  item,
  side,
}: {
  title: string;
  tone: "ai" | "human";
  item: ReportComparison;
  side: "ai" | "human";
}) {
  const findingsAi = item.ai_findings;
  const findingsHuman = item.radiologist_findings;
  const impressionAi = item.ai_impression;
  const impressionHuman = item.radiologist_impression;
  const recommendationsAi = item.ai_recommendations;
  const recommendationsHuman = item.radiologist_recommendations;
  const risk = side === "ai" ? item.ai_risk_level : item.radiologist_risk_level;

  return (
    <div
      className="space-y-2 p-3 text-xs leading-relaxed"
      style={{
        borderRadius: "var(--radius)",
        background: tone === "ai" ? "rgba(56, 189, 248, 0.06)" : "rgba(34, 197, 94, 0.06)",
        border: `1px solid ${tone === "ai" ? "rgba(56, 189, 248, 0.2)" : "rgba(34, 197, 94, 0.2)"}`,
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      {side === "ai" && item.edited && (
        <p className="text-[10px]" style={{ color: "var(--danger)" }}>
          Red strikethrough = text removed by the radiologist
        </p>
      )}
      <p className="text-[10px]">
        Risk level:{" "}
        {side === "ai" && item.edited && item.ai_risk_level !== item.radiologist_risk_level ? (
          <>
            <span className="diff-deleted capitalize">{item.ai_risk_level}</span>
            <span className="text-muted"> → </span>
            <strong className="capitalize">{item.radiologist_risk_level}</strong>
          </>
        ) : (
          <strong className="capitalize">{risk}</strong>
        )}
      </p>
      <DiffBlock
        label="Findings"
        original={findingsAi}
        revised={findingsHuman}
        side={side}
        edited={item.edited}
      />
      <DiffBlock
        label="Impression"
        original={impressionAi}
        revised={impressionHuman}
        side={side}
        edited={item.edited}
      />
      <DiffBlock
        label="Recommendations"
        original={recommendationsAi}
        revised={recommendationsHuman}
        side={side}
        edited={item.edited}
      />
    </div>
  );
}

function DiffBlock({
  label,
  original,
  revised,
  side,
  edited,
}: {
  label: string;
  original: string;
  revised: string;
  side: "ai" | "human";
  edited: boolean;
}) {
  const showDiff = edited && original !== revised;
  const segments =
    side === "ai"
      ? aiDiffSegments(original, revised)
      : humanDiffSegments(original, revised);

  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase text-muted">{label}</p>
      {showDiff ? (
        <p className="whitespace-pre-wrap">
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
      ) : (
        <p className="whitespace-pre-wrap">{(side === "ai" ? original : revised) || "—"}</p>
      )}
    </div>
  );
}
