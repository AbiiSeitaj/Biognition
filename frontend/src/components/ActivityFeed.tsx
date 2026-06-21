"use client";

import Link from "next/link";
import { Activity, AlertTriangle, Upload } from "lucide-react";
import type { ActivityEvent } from "@/lib/types";

const ICONS = {
  upload: Upload,
  analysis: Activity,
  alert: AlertTriangle,
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <section className="card p-5">
        <h2 className="section-title mb-2">Live activity</h2>
        <p className="text-base" style={{ color: "var(--text-muted)" }}>
          No recent events yet.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="section-title">Live activity</h2>
        <span className="status-pill">Updates every 30s</span>
      </div>
      <ul className="space-y-3">
        {events.slice(0, 8).map((ev) => {
          const Icon = ICONS[ev.type] ?? Activity;
          return (
            <li
              key={ev.id}
              className="flex gap-3 border-b pb-3 last:border-0 last:pb-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center"
                style={{
                  background: "var(--surface-muted)",
                  borderRadius: "var(--radius-md)",
                  color: ev.type === "alert" ? "var(--danger)" : "var(--primary)",
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                {ev.study_id ? (
                  <Link
                    href={`/viewer/${ev.study_id}`}
                    className="block truncate text-base font-medium hover:underline"
                  >
                    {ev.title}
                  </Link>
                ) : (
                  <p className="truncate text-base font-medium">{ev.title}</p>
                )}
                <p className="truncate text-sm" style={{ color: "var(--text-secondary)" }}>
                  {ev.detail}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatRelative(ev.timestamp)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}
