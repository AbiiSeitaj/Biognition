"use client";

import { Search } from "lucide-react";

interface SearchFilterBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  modality: string;
  onModalityChange: (m: string) => void;
  risk: string;
  onRiskChange: (r: string) => void;
}

const MODALITIES = [
  { value: "ALL", label: "All scan types" },
  { value: "XR", label: "X-Ray" },
  { value: "CT", label: "CT scan" },
  { value: "MR", label: "MRI" },
  { value: "US", label: "Ultrasound" },
];

const RISKS = [
  { value: "ALL", label: "All priority levels" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "moderate", label: "Moderate" },
  { value: "low", label: "Low" },
  { value: "pending", label: "Not analyzed yet" },
];

export function SearchFilterBar({
  query,
  onQueryChange,
  modality,
  onModalityChange,
  risk,
  onRiskChange,
}: SearchFilterBarProps) {
  return (
    <div className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-end">
      <div className="relative flex-1">
        <label htmlFor="study-search" className="label-field">
          Find a patient or scan
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            id="study-search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Type patient name or ID…"
            className="input-field pl-11"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:w-auto lg:min-w-[28rem]">
        <div>
          <label htmlFor="filter-modality" className="label-field">
            Scan type
          </label>
          <select
            id="filter-modality"
            value={modality}
            onChange={(e) => onModalityChange(e.target.value)}
            className="select-field"
          >
            {MODALITIES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-risk" className="label-field">
            Priority
          </label>
          <select
            id="filter-risk"
            value={risk}
            onChange={(e) => onRiskChange(e.target.value)}
            className="select-field"
          >
            {RISKS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function filterStudies<
  T extends {
    patient: { name: string; patient_id: string };
    modality: string;
    description: string;
    body_part: string;
    report: { risk_level: string } | null;
  },
>(studies: T[], query: string, modality: string, risk: string): T[] {
  const q = query.toLowerCase().trim();
  return studies.filter((s) => {
    if (modality !== "ALL" && s.modality !== modality) return false;
    if (risk === "pending" && s.report) return false;
    if (risk !== "ALL" && risk !== "pending" && s.report?.risk_level !== risk) return false;
    if (!q) return true;
    return (
      s.patient.name.toLowerCase().includes(q) ||
      s.patient.patient_id.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.body_part.toLowerCase().includes(q)
    );
  });
}
