"use client";



import { useEffect, useMemo, useState } from "react";

import { Archive, Database } from "lucide-react";

import { api } from "@/lib/api";

import type { Study } from "@/lib/types";

import { StudyCard } from "@/components/StudyCard";

import { SearchFilterBar, filterStudies } from "@/components/SearchFilterBar";



export default function ArchivePage() {

  const [studies, setStudies] = useState<Study[]>([]);

  const [query, setQuery] = useState("");

  const [modality, setModality] = useState("ALL");

  const [risk, setRisk] = useState("ALL");



  useEffect(() => {

    api.getStudies().then((s) => setStudies(s.filter((x) => x.archived)));

  }, []);



  const filtered = useMemo(

    () => filterStudies(studies, query, modality, risk),

    [studies, query, modality, risk]

  );



  return (

    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">

      <header className="page-header flex items-start gap-4">

        <div className="logo-mark h-12 w-12 shrink-0">
          <Archive className="h-6 w-6" />
        </div>

        <div>

          <h1 className="page-title">PACS Archive</h1>

          <p className="page-subtitle">

            Secure storage for analyzed studies, DICOM files, and AI reports

          </p>

        </div>

      </header>



      <div className="mb-6 grid gap-4 sm:grid-cols-3">

        <div className="card flex items-center gap-4 p-4">

          <Database className="h-8 w-8" style={{ color: "var(--primary)" }} />

          <div>

            <p className="text-2xl font-bold tabular-nums">{studies.length}</p>

            <p className="text-sm text-slate-500">Archived studies</p>

          </div>

        </div>

        <div className="card col-span-2 p-4">

          <p className="text-sm text-slate-600">

            <strong className="text-slate-800">PACS pipeline:</strong> Upload → AI Analysis →

            Automatic archival → Cross-department sharing with risk-based alerts.

          </p>

        </div>

      </div>



      <div className="mb-4">

        <SearchFilterBar

          query={query}

          onQueryChange={setQuery}

          modality={modality}

          onModalityChange={setModality}

          risk={risk}

          onRiskChange={setRisk}

        />

      </div>



      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">

        {filtered.map((s) => (

          <StudyCard key={s.id} study={s} />

        ))}

      </div>



      {filtered.length === 0 && (

        <div className="card flex flex-col items-center px-8 py-14 text-center">

          <Archive className="mb-4 h-12 w-12 text-slate-300" />

          <p className="text-lg font-semibold text-slate-800">

            {studies.length === 0 ? "No archived studies yet" : "No matching studies"}

          </p>

          <p className="mt-2 max-w-md text-sm text-slate-600">

            Studies are automatically archived to PACS after AI analysis completes.

          </p>

        </div>

      )}

    </div>

  );

}
