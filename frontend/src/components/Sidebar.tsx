"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Archive,
  Bell,
  Building2,
  LayoutDashboard,
  Scan,
  Upload,
} from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/archive", label: "PACS Archive", icon: Archive },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/notifications", label: "Alerts", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-medical-950/80 backdrop-blur-xl">
      <div className="border-b border-white/10 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Scan className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Dr Scan</h1>
            <p className="text-xs text-cyan-400/80">AI · PACS · DICOM</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-cyan-500/15 text-cyan-300 shadow-inner"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="glass-panel p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            JunctionX Tirana 2024
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            Digital Health Challenge — Startup Albania
          </p>
        </div>
      </div>
    </aside>
  );
}
