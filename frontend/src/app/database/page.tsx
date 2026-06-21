"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, Loader2, Search } from "lucide-react";
import { api } from "@/lib/api";
import type { PacsPatientIndexItem, PacsPatientRecord } from "@/lib/types";
import { PacsPatientFile } from "@/components/PacsPatientFile";

export default function DatabasePage() {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PacsPatientIndexItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [record, setRecord] = useState<PacsPatientRecord | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoadingList(true);
    setError("");
    api
      .queryPacsPatients(query || undefined)
      .then((data) => {
        setPatients(data.patients);
        setSelectedKey((prev) => {
          if (prev && data.patients.some((p) => p.patient_id === prev)) return prev;
          return data.patients[0]?.patient_id ?? null;
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to query PACS index"))
      .finally(() => setLoadingList(false));
  }, [query]);

  useEffect(() => {
    if (!selectedKey) {
      setRecord(null);
      return;
    }
    setLoadingRecord(true);
    api
      .getPacsPatientRecord(selectedKey)
      .then(setRecord)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to retrieve patient record"))
      .finally(() => setLoadingRecord(false));
  }, [selectedKey]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.patient_id === selectedKey) ?? null,
    [patients, selectedKey]
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center"
            style={{ borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <Database className="h-5 w-5" style={{ color: "var(--ai)" }} />
          </div>
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-wide">PACS Patient Database</h1>
            <p className="mt-0.5 text-xs text-muted">
              Patient-centric archive index — query and retrieve DICOM studies with linked reports (C-FIND / C-MOVE)
            </p>
          </div>
        </div>
        <div className="rounded border border-[var(--border)] px-3 py-2 text-[10px] text-muted" style={{ background: "var(--surface-muted)" }}>
          <p className="font-semibold uppercase tracking-wide">PACS modules</p>
          <p className="mt-1">Patient · Study · Image · Structured Report</p>
        </div>
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="input-field w-full pl-9"
          placeholder="Search patient ID or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <section className="panel overflow-hidden">
          <div className="border-b border-[var(--border)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Patient index ({patients.length})
            </p>
          </div>
          <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
            {loadingList ? (
              <div className="flex items-center gap-2 p-4 text-xs text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Querying PACS…
              </div>
            ) : patients.length === 0 ? (
              <p className="p-4 text-xs text-muted">No patient records match this query.</p>
            ) : (
              patients.map((patient) => (
                <button
                  key={patient.patient_id}
                  type="button"
                  onClick={() => setSelectedKey(patient.patient_id)}
                  className="block w-full border-b border-[var(--border)] px-3 py-3 text-left transition last:border-b-0 hover:bg-[var(--surface-muted)]"
                  style={
                    selectedKey === patient.patient_id
                      ? { background: "var(--surface-muted)", borderLeft: "3px solid var(--ai)" }
                      : undefined
                  }
                >
                  <p className="text-xs font-medium">{patient.name}</p>
                  <p className="font-mono text-[10px] text-muted">{patient.patient_id}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    {patient.study_count} studies · {patient.archived_count} archived ·{" "}
                    {patient.modalities.join(", ") || "—"}
                  </p>
                  <p className="text-[10px] text-muted">Last activity {formatDate(patient.last_activity_at)}</p>
                </button>
              ))
            )}
          </div>
        </section>

        <div>
          {loadingRecord && selectedPatient ? (
            <div className="panel flex min-h-[480px] items-center justify-center gap-2 text-xs text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Retrieving {selectedPatient.patient_id} from PACS…
            </div>
          ) : (
            <PacsPatientFile record={record} />
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}
