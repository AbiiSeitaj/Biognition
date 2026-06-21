"use client";



import { useEffect, useState } from "react";

import Link from "next/link";

import { Bell, Check, ShieldAlert } from "lucide-react";

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

    <div className="mx-auto max-w-3xl p-6 lg:p-8">

      <header className="page-header flex items-start gap-4">

        <div className="logo-mark h-12 w-12 shrink-0">
          <Bell className="h-6 w-6" />
        </div>

        <div>

          <h1 className="page-title">Risk Alerts</h1>

          <p className="page-subtitle">

            {unread.length > 0

              ? `${unread.length} unread alert${unread.length === 1 ? "" : "s"} requiring attention`

              : "Automatic notifications for high-risk AI findings"}

          </p>

        </div>

      </header>



      {unread.length > 0 && (

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">

          <ShieldAlert className="h-5 w-5 shrink-0" />

          High-risk findings are automatically routed to Radiology, Emergency, and relevant departments.

        </div>

      )}



      <div className="space-y-3">

        {notifications.map((n) => (

          <div

            key={n.id}

            className={`card p-5 transition ${!n.read ? "border-red-200 bg-red-50/40 ring-1 ring-red-100" : ""}`}

          >

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <span className="badge-modality">{n.department}</span>

                  {!n.read && (

                    <span className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white">

                      NEW

                    </span>

                  )}

                </div>

                <h3 className="mt-2 font-semibold text-slate-900">{n.title}</h3>

                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{n.message}</p>

                <p className="mt-2 text-xs text-slate-400">

                  {new Date(n.created_at).toLocaleString()}

                </p>

              </div>

              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">

                <RiskBadge

                  level={n.risk_score >= 0.85 ? "critical" : "high"}

                  score={n.risk_score}

                  size="md"

                />

                <div className="flex gap-2">

                  <Link href={`/viewer/${n.study_id}`} className="btn-primary px-4 py-2 text-sm">

                    View Study

                  </Link>

                  {!n.read && (

                    <button

                      type="button"

                      onClick={() => markRead(n.id)}

                      title="Mark as read"

                      className="btn-secondary px-3 py-2"

                    >

                      <Check className="h-4 w-4" />

                    </button>

                  )}

                </div>

              </div>

            </div>

          </div>

        ))}

        {notifications.length === 0 && (

          <div className="card flex flex-col items-center px-8 py-14 text-center">

            <Bell className="mb-4 h-12 w-12 text-slate-300" />

            <p className="text-lg font-semibold text-slate-800">No alerts yet</p>

            <p className="mt-2 max-w-md text-sm text-slate-600">

              High-risk study findings will appear here automatically after AI analysis.

            </p>

          </div>

        )}

      </div>

    </div>

  );

}
