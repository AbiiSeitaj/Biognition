"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Send } from "lucide-react";
import { api } from "@/lib/api";
import type { CaseMessage, StaffProfile, TeamCase } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { RiskBadge } from "./RiskBadge";

function roleLabel(role: string) {
  if (role === "radiologist") return "Radiologist";
  if (role === "doctor") return "Department Doctor";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function StaffChip({ person }: { person: StaffProfile }) {
  return (
    <div className="rounded border border-[var(--border)] px-2 py-1.5" style={{ background: "var(--surface-muted)" }}>
      <p className="text-xs font-medium">
        {person.first_name} {person.last_name}
      </p>
      <p className="font-mono text-[10px] text-muted">
        {person.dept_id} · {roleLabel(person.role)}
        {person.department ? ` · ${person.department}` : ""}
      </p>
    </div>
  );
}

export function CaseTeamPanel({ teamCase }: { teamCase: TeamCase | null }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!teamCase) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setError("");
    api
      .getCaseMessages(teamCase.study.id)
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load chat"))
      .finally(() => setLoading(false));
    const timer = setInterval(() => {
      api.getCaseMessages(teamCase.study.id).then(setMessages).catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [teamCase?.study.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!teamCase || !draft.trim()) return;
    setSending(true);
    setError("");
    try {
      const msg = await api.postCaseMessage(teamCase.study.id, draft.trim());
      setMessages((prev) => [...prev, msg]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  if (!teamCase) {
    return (
      <div className="panel flex min-h-[420px] items-center justify-center p-8 text-center text-sm text-muted">
        Select a shared case to view assignment details and department chat.
      </div>
    );
  }

  const { study } = teamCase;

  return (
    <div className="panel flex min-h-[420px] flex-col overflow-hidden">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{study.patient.name}</p>
            <p className="text-xs text-muted">
              {study.modality} · {study.description || study.body_part} · {study.patient.patient_id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {study.report && <RiskBadge level={study.report.risk_level} score={study.report.risk_score} size="sm" />}
            <Link href={`/viewer/${study.id}`} className="btn-secondary px-2 py-1 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              Open study
            </Link>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <MetaBlock label="Submitted from" value={teamCase.submit_source} />
          <MetaBlock
            label="Submitted by"
            value={
              teamCase.submitter
                ? `${teamCase.submitter.first_name} ${teamCase.submitter.last_name} (${teamCase.submitter.dept_id})`
                : "Unknown"
            }
          />
          <MetaBlock
            label="Radiologist approval"
            value={
              teamCase.approved && teamCase.approver
                ? `${teamCase.approver.first_name} ${teamCase.approver.last_name} (${teamCase.approver.dept_id})`
                : teamCase.approved
                  ? study.report?.approved_by || "Approved"
                  : "Pending sign-off"
            }
          />
          <MetaBlock label="Assigned clinicians" value={`${teamCase.assignees.length} on this case`} />
        </div>

        {teamCase.assignees.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {teamCase.assignees.map((person) => (
              <StaffChip key={person.id} person={person} />
            ))}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-[var(--border)] px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Case chat</p>
          <p className="text-[11px] text-muted">Doctors assigned to this case can coordinate across departments.</p>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <p className="text-xs text-muted">No messages yet. Start the conversation for this case.</p>
          ) : (
            messages.map((msg) => {
              const mine = user?.id === msg.author.id;
              return (
                <div key={msg.id} className={mine ? "ml-8" : "mr-8"}>
                  <div
                    className="rounded border px-3 py-2"
                    style={{
                      borderColor: "var(--border)",
                      background: mine ? "var(--surface-muted)" : "var(--surface)",
                    }}
                  >
                    <p className="text-xs font-medium">
                      {msg.author.first_name} {msg.author.last_name}
                      <span className="ml-2 font-mono text-[10px] text-muted">
                        {msg.author.dept_id} · {roleLabel(msg.author.role)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{msg.body}</p>
                    <p className="mt-1 text-[10px] text-muted">
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="border-t border-[var(--border)] p-3">
          {error && (
            <p className="mb-2 text-xs" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <input
              className="input-field min-w-0 flex-1"
              placeholder="Message assigned team…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
            />
            <button type="submit" disabled={sending || !draft.trim()} className="btn-primary px-3">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--border)] px-2.5 py-2" style={{ background: "var(--surface-muted)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-xs">{value}</p>
    </div>
  );
}
