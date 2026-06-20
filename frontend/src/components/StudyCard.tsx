"use client";

import Link from "next/link";
import { ArrowRight, Brain } from "lucide-react";
import type { Study } from "@/lib/types";
import { api } from "@/lib/api";
import { RiskBadge } from "./RiskBadge";

export function StudyCard({ study }: { study: Study }) {
  return (
    <div className="glass-panel group overflow-hidden transition hover:border-cyan-500/30">
      <div className="relative aspect-[4/3] bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={api.thumbnailUrl(study.id)}
          alt={study.description}
          className="h-full w-full object-contain p-2"
        />
        <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
          {study.modality}
        </div>
        {study.report && (
          <div className="absolute right-2 top-2">
            <RiskBadge level={study.report.risk_level} score={study.report.risk_score} size="sm" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="truncate text-sm font-medium text-white">{study.patient.name}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{study.description || study.body_part}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">{study.patient.patient_id}</span>
          <Link
            href={`/viewer/${study.id}`}
            className="flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300"
          >
            Open Viewer <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {!study.report && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400">
            <Brain className="h-3 w-3" /> Pending AI analysis
          </div>
        )}
      </div>
    </div>
  );
}
