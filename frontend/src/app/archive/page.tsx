"use client";

import { useEffect, useState } from "react";
import { Archive } from "lucide-react";
import { api } from "@/lib/api";
import type { Study } from "@/lib/types";
import { StudyCard } from "@/components/StudyCard";

export default function ArchivePage() {
  const [studies, setStudies] = useState<Study[]>([]);

  useEffect(() => {
    api.getStudies().then((s) => setStudies(s.filter((x) => x.archived)));
  }, []);

  return (
    <div className="p-8">
      <header className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-blue-500/10 p-3">
          <Archive className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">PACS Archive</h1>
          <p className="text-sm text-slate-400">
            Centralized storage — images, AI reports, and patient records
          </p>
        </div>
      </header>

      <div className="mb-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-cyan-200/80">
        Workflow: Upload → AI Analysis → Automatic PACS Archiving → Cross-department Access
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {studies.map((s) => (
          <StudyCard key={s.id} study={s} />
        ))}
        {studies.length === 0 && (
          <p className="col-span-full text-sm text-slate-500">No archived studies yet.</p>
        )}
      </div>
    </div>
  );
}
