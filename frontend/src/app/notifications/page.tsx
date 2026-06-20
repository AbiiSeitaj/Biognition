"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { api } from "@/lib/api";
import type { Notification } from "@/lib/types";
import { RiskBadge } from "@/components/RiskBadge";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    api.getNotifications().then(setNotifications);
  }, []);

  async function markRead(id: number) {
    await api.markRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="p-8">
      <header className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-red-500/10 p-3">
          <Bell className="h-6 w-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Risk Alerts</h1>
          <p className="text-sm text-slate-400">
            Automatic notifications for high-risk findings — {unread.length} unread
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`glass-panel p-4 ${!n.read ? "border-red-500/20 bg-red-500/5" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] uppercase text-slate-400">
                    {n.department}
                  </span>
                  {!n.read && (
                    <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-300">NEW</span>
                  )}
                </div>
                <h3 className="mt-2 text-sm font-semibold text-white">{n.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{n.message}</p>
                <p className="mt-2 text-[10px] text-slate-600">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <RiskBadge
                  level={n.risk_score >= 0.85 ? "critical" : "high"}
                  score={n.risk_score}
                  size="sm"
                />
                <div className="flex gap-2">
                  <Link
                    href={`/viewer/${n.study_id}`}
                    className="rounded-lg bg-cyan-600/20 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-600/30"
                  >
                    View Study
                  </Link>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="text-sm text-slate-500">No alerts yet. High-risk studies trigger automatic notifications.</p>
        )}
      </div>
    </div>
  );
}
