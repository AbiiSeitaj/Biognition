"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Study } from "@/lib/types";
import {
  filterWorklistStudies,
  sortStudiesByRisk,
  type ModalityFilter,
  type StatusFilter,
} from "@/lib/studyWorklist";
import { WorklistTable } from "./WorklistTable";

const MODALITIES: ModalityFilter[] = ["ALL", "XR", "CT", "MR", "US"];
const STATUSES: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "analyzed", label: "Analyzed" },
  { id: "approved", label: "Approved" },
  { id: "archived", label: "Archived" },
];

export function WorklistScreen() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modality, setModality] = useState<ModalityFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const loadStudies = useCallback(() => {
    api
      .getStudies()
      .then((data) => {
        setStudies(data);
        setError("");
      })
      .catch((err) => {
        setError(
          err instanceof Error && err.message.includes("Cannot reach")
            ? "Worklist unavailable — API unreachable. Start the backend and refresh."
            : "Worklist unavailable — reload the page or check the API connection."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStudies();
    const timer = setInterval(loadStudies, 30000);
    return () => clearInterval(timer);
  }, [loadStudies]);

  const pendingCount = useMemo(
    () => studies.filter((s) => !s.report && !s.archived).length,
    [studies]
  );

  const filteredStudies = useMemo(() => {
    if (!query) return studies;
    return studies.filter((s) => {
      const hay = `${s.patient.name} ${s.patient.patient_id} ${s.body_part} ${s.modality}`.toLowerCase();
      return hay.includes(query);
    });
  }, [studies, query]);

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide">Worklist</h1>
          <p className="mt-0.5 text-xs text-muted">
            Pending review · sorted by risk · {studies.length} studies
            {pendingCount > 0 && ` · ${pendingCount} awaiting analysis`}
          </p>
        </div>
      </header>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Modality filter">
          {MODALITIES.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modality === m}
              onClick={() => setModality(m)}
              className={clsx("filter-tab font-mono", modality === m && "filter-tab-active")}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-[var(--border)]" />

        <label className="flex items-center gap-2 text-[11px] text-muted">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="select-field w-auto min-w-[7rem]"
          >
            {STATUSES.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="mb-3 text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {loading ? (
        <div className="panel p-8 text-center text-xs text-muted">Loading worklist…</div>
      ) : (
        <WorklistTable studies={filteredStudies} modality={modality} status={status} />
      )}
    </div>
  );
}
