"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Study } from "@/lib/types";
import { RiskBadge } from "@/components/RiskBadge";

const DEPARTMENTS = [
  { id: "radiology", name: "Radiology", desc: "Primary diagnostic imaging" },
  { id: "cardiology", name: "Cardiology", desc: "Cardiac & thoracic findings" },
  { id: "surgery", name: "Surgery", desc: "Pre-op imaging review" },
  { id: "emergency", name: "Emergency", desc: "Urgent triage & escalation" },
  { id: "operations", name: "Operations", desc: "Analytics & workflow" },
];

export default function DepartmentsPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [active, setActive] = useState("radiology");

  useEffect(() => {
    api.getStudies().then(setStudies);
  }, []);

  const archived = studies.filter((s) => s.archived);

  return (
    <div className="p-8">
      <header className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-purple-500/10 p-3">
          <Building2 className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Cross-Department Access</h1>
          <p className="text-sm text-slate-400">Real-time shared access to PACS studies across departments</p>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {DEPARTMENTS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActive(d.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              active === d.id
                ? "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30"
                : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <p className="mb-4 text-xs text-slate-500">
        Viewing as: <span className="text-purple-300">{DEPARTMENTS.find((d) => d.id === active)?.name}</span>
        {" — "}
        {DEPARTMENTS.find((d) => d.id === active)?.desc}
      </p>

      <div className="space-y-2">
        {archived.map((s) => (
          <Link
            key={s.id}
            href={`/viewer/${s.id}`}
            className="glass-panel flex items-center justify-between p-4 transition hover:border-purple-500/20"
          >
            <div className="flex items-center gap-4">
              <span className="rounded bg-black/40 px-2 py-1 font-mono text-xs text-cyan-400">
                {s.modality}
              </span>
              <div>
                <p className="text-sm font-medium text-white">{s.patient.name}</p>
                <p className="text-xs text-slate-400">{s.description}</p>
              </div>
            </div>
            {s.report ? (
              <RiskBadge level={s.report.risk_level} score={s.report.risk_score} size="sm" />
            ) : (
              <span className="text-xs text-slate-500">No report</span>
            )}
          </Link>
        ))}
        {archived.length === 0 && (
          <p className="text-sm text-slate-500">No shared studies available yet.</p>
        )}
      </div>
    </div>
  );
}
