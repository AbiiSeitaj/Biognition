"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, MessageSquare, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { TeamBoard, TeamCase } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { CaseTeamPanel, StaffChip } from "@/components/CaseTeamPanel";
import { PacsNetworkPanel } from "@/components/PacsNetworkPanel";
import { RiskBadge } from "@/components/RiskBadge";

const DEPARTMENTS = [
  { id: "radiology", name: "Radiology" },
  { id: "cardiology", name: "Cardiology" },
  { id: "surgery", name: "Surgery" },
  { id: "emergency", name: "Emergency" },
  { id: "operations", name: "Operations" },
];

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [active, setActive] = useState(user?.department || "radiology");
  const [board, setBoard] = useState<TeamBoard | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshBoard = () => {
    api
      .getTeamBoard(active)
      .then(setBoard)
      .catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .getTeamBoard(active)
      .then((data) => {
        setBoard(data);
        setSelectedId((prev) => {
          if (prev && data.cases.some((c) => c.study.id === prev)) return prev;
          return data.cases[0]?.study.id ?? null;
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load team board"))
      .finally(() => setLoading(false));
  }, [active]);

  const selectedCase = useMemo(
    () => board?.cases.find((c) => c.study.id === selectedId) ?? null,
    [board, selectedId]
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center"
            style={{ borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <Building2 className="h-5 w-5" style={{ color: "var(--ai)" }} />
          </div>
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-wide">Teams</h1>
            <p className="mt-0.5 text-xs text-muted">
              Cross-department workload sharing, case assignments, and team chat
            </p>
          </div>
        </div>
        {user && (
          <div className="rounded border border-[var(--border)] px-3 py-2 text-xs" style={{ background: "var(--surface-muted)" }}>
            <p className="font-medium">
              {user.first_name || user.full_name} {user.last_name || ""}
            </p>
            <p className="font-mono text-[10px] text-muted">
              {user.dept_id || "—"} · {user.role} · {user.department || "all departments"}
            </p>
          </div>
        )}
      </header>

      <div className="flex flex-wrap gap-1">
        {DEPARTMENTS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActive(d.id)}
            className={active === d.id ? "filter-tab filter-tab-active" : "filter-tab"}
          >
            {d.name}
          </button>
        ))}
      </div>

      {board && board.members.length > 0 && (
        <section className="panel p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            <Users className="h-3.5 w-3.5" />
            Department roster — {active}
          </p>
          <div className="flex flex-wrap gap-2">
            {board.members.map((person) => (
              <StaffChip key={person.id} person={person} />
            ))}
          </div>
        </section>
      )}

      {error && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Shared cases — {DEPARTMENTS.find((d) => d.id === active)?.name}
          </p>
          {loading ? (
            <div className="panel flex items-center gap-2 p-6 text-xs text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading cases…
            </div>
          ) : !board || board.cases.length === 0 ? (
            <div className="panel p-8 text-center text-xs text-muted">
              No archived cases synced to this department yet.
            </div>
          ) : (
            board.cases.map((teamCase) => (
              <CaseRow
                key={teamCase.study.id}
                teamCase={teamCase}
                active={selectedId === teamCase.study.id}
                onSelect={() => setSelectedId(teamCase.study.id)}
              />
            ))
          )}
        </section>

        <CaseTeamPanel teamCase={selectedCase} onMessageSent={refreshBoard} />
      </div>
    </div>
  );
}

function CaseRow({
  teamCase,
  active,
  onSelect,
}: {
  teamCase: TeamCase;
  active: boolean;
  onSelect: () => void;
}) {
  const { study } = teamCase;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="panel w-full p-3 text-left transition"
      style={active ? { borderColor: "var(--ai)", background: "var(--surface-muted)" } : undefined}
    >
      <div className="flex items-start gap-3">
        <span className="badge-modality font-mono">{study.modality}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{study.patient.name}</p>
          <p className="truncate text-[10px] text-muted">{study.description || study.body_part}</p>
          <p className="mt-1 truncate text-[10px] text-muted">From: {teamCase.submit_source}</p>
          <p className="truncate text-[10px] text-muted">
            {teamCase.approved && teamCase.approver
              ? `Approved by ${teamCase.approver.first_name} ${teamCase.approver.last_name} (${teamCase.approver.dept_id})`
              : teamCase.approved
                ? `Approved by ${study.report?.approved_by}`
                : "Awaiting radiologist approval"}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted">
            <span>{teamCase.assignees.length} assigned</span>
            {teamCase.message_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {teamCase.message_count}
              </span>
            )}
          </p>
        </div>
        {study.report ? (
          <RiskBadge level={study.report.risk_level} score={study.report.risk_score} size="sm" />
        ) : (
          <span className="text-[10px] text-muted">Pending AI</span>
        )}
      </div>
    </button>
  );
}
