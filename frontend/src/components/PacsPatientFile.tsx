"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import type { PacsPatientRecord, PacsStudyArchive } from "@/lib/types";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { RiskBadge } from "@/components/RiskBadge";

export function PacsPatientFile({ record }: { record: PacsPatientRecord | null }) {
  if (!record) {
    return (
      <div className="panel flex min-h-[480px] items-center justify-center p-8 text-center text-sm text-muted">
        Select a patient record to retrieve archived studies and reports from PACS.
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-[var(--border)] p-4">
        <p className="text-sm font-semibold">{record.name}</p>
        <p className="mt-1 font-mono text-xs text-muted">
          Patient ID {record.patient_id}
          {record.sex ? ` · ${record.sex}` : ""}
          {record.age ? ` · ${record.age}y` : ""}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <PacsMeta label="Record opened" value={formatDate(record.record_opened_at)} />
          <PacsMeta label="Studies in file" value={String(record.study_count)} />
          <PacsMeta label="Archived to PACS" value={String(record.archived_count)} />
        </div>
      </div>

      <div className="max-h-[calc(100vh-280px)] space-y-4 overflow-y-auto p-4">
        {record.archives.length === 0 ? (
          <p className="text-xs text-muted">No studies in this patient file yet.</p>
        ) : (
          record.archives.map((entry) => <PacsArchiveEntry key={entry.study.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}

function PacsArchiveEntry({ entry }: { entry: PacsStudyArchive }) {
  const { study, report } = entry;

  return (
    <article className="overflow-hidden rounded border border-[var(--border)]" style={{ background: "var(--surface-muted)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold">
            {study.modality} · {study.description || study.body_part}
          </p>
          <p className="font-mono text-[10px] text-muted">Study UID {study.study_uid.slice(0, 24)}…</p>
        </div>
        <div className="flex items-center gap-2">
          {report && <RiskBadge level={report.risk_level} score={report.risk_score} size="sm" />}
          <Link href={`/viewer/${study.id}`} className="btn-secondary px-2 py-1 text-[10px]">
            <ExternalLink className="h-3 w-3" />
            Viewer
          </Link>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-[var(--border)] p-3 lg:border-b-0 lg:border-r">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">DICOM image</p>
          <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--viewer-bg)]">
            <AuthenticatedImage
              studyId={study.id}
              alt={`${study.modality} study for ${study.patient.name}`}
              className="aspect-[4/3] w-full object-contain p-2"
            />
          </div>
          <dl className="mt-2 space-y-1 text-[10px] text-muted">
            <div className="flex justify-between gap-2">
              <dt>Uploaded</dt>
              <dd>{formatDate(study.uploaded_at)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>PACS archived</dt>
              <dd>{entry.archived ? formatDate(entry.archived_at) : "Staging"}</dd>
            </div>
            {entry.submit_source && (
              <div className="flex justify-between gap-2">
                <dt>Origin</dt>
                <dd className="text-right">{entry.submit_source}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Structured report</p>
          {report ? (
            <div className="space-y-2 text-xs leading-relaxed">
              <ReportBlock title="Findings" text={report.findings} />
              <ReportBlock title="Impression" text={report.impression} />
              <ReportBlock title="Recommendations" text={report.recommendations} />
              <p className="text-[10px] text-muted">
                {report.approved
                  ? `Signed off by ${report.approved_by || "radiologist"}`
                  : "Awaiting radiologist sign-off"}
                {" · "}
                Analyzed {formatDate(report.analyzed_at)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted">No AI report archived for this study yet.</p>
          )}
        </div>
      </div>

      {study.pacs_locations && study.pacs_locations.length > 0 && (
        <div className="border-t border-[var(--border)] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">PACS nodes</p>
          <p className="mt-1 text-[10px] text-muted">
            {study.pacs_locations.map((loc) => `${loc.campus} (${loc.department})`).join(" · ")}
          </p>
        </div>
      )}
    </article>
  );
}

function ReportBlock({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const preview = text.length > 280 && !open ? `${text.slice(0, 280)}…` : text;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-0.5 whitespace-pre-wrap">{preview}</p>
      {text.length > 280 && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-[10px] hover:underline" style={{ color: "var(--ai)" }}>
          {open ? "Show less" : "Show full text"}
        </button>
      )}
    </div>
  );
}

function PacsMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--border)] px-2 py-1.5" style={{ background: "var(--surface)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="text-xs">{value}</p>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
