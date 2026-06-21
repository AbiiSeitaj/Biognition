"use client";

import Link from "next/link";
import { Calendar, ChevronRight, FileText, User } from "lucide-react";
import type { Study } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";

interface PatientProfilePanelProps {
  study: Study;
  allStudies?: Study[];
}

export function PatientProfilePanel({ study, allStudies = [] }: PatientProfilePanelProps) {
  const initials = study.patient.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const patientStudies = allStudies.filter(
    (s) => s.patient.patient_id === study.patient.patient_id
  );

  return (
    <aside className="card flex h-full flex-col overflow-hidden">
      <div className="panel-header p-5">
        <div className="flex items-start gap-4">
          <div className="patient-avatar shrink-0">{initials || "?"}</div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{study.patient.name}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{study.patient.patient_id}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {study.patient.age != null && (
                <span
                  className="px-2 py-0.5 text-xs font-medium"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {study.patient.age} yrs
                </span>
              )}
              {study.patient.sex && (
                <span
                  className="px-2 py-0.5 text-xs font-medium"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {study.patient.sex}
                </span>
              )}
              <span className="badge-modality">{study.modality}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <section className="mb-5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            <User className="h-3.5 w-3.5" />
            Patient Info
          </h3>
          <dl className="space-y-2.5 text-sm">
            <InfoRow label="Body Part" value={study.body_part} />
            <InfoRow label="Study UID" value={study.study_uid.slice(-16)} mono />
            <InfoRow
              label="Uploaded"
              value={new Date(study.uploaded_at).toLocaleDateString()}
            />
            <InfoRow
              label="PACS Status"
              value={study.archived ? "Archived" : "Pending"}
              highlight={study.archived ? "ok" : "warn"}
            />
          </dl>
        </section>

        {study.report && (
          <section className="mb-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              <FileText className="h-3.5 w-3.5" />
              AI Assessment
            </h3>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <RiskBadge
                level={study.report.risk_level}
                score={study.report.risk_score}
                size="md"
              />
              {study.report.anomalies.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {study.report.anomalies.slice(0, 3).map((a, i) => (
                    <li key={i} className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{a.label}</span>
                      <div className="mt-1 confidence-bar">
                        <div
                          className="confidence-fill"
                          style={{ width: `${Math.round(a.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="mt-0.5 block text-[10px] text-slate-500">
                        {Math.round(a.confidence * 100)}% confidence
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {patientStudies.length > 1 && (
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              <Calendar className="h-3.5 w-3.5" />
              Scan History
            </h3>
            <div className="space-y-2">
              {patientStudies.map((s) => (
                <Link
                  key={s.id}
                  href={`/viewer/${s.id}`}
                  className={`flex items-center gap-3 border p-3 transition ${
                    s.id === study.id
                      ? "nav-link-active"
                      : "border-[var(--border)] hover:bg-[var(--surface-muted)]"
                  }`}
                  style={{ borderRadius: "var(--radius-md)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {s.modality} — {s.body_part}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(s.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  {s.id !== study.id && (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}

function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: "ok" | "warn";
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`truncate font-medium ${
          highlight === "ok"
            ? "text-emerald-700"
            : highlight === "warn"
              ? "text-amber-700"
              : "text-slate-800"
        } ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
