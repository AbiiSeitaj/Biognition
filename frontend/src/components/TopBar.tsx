"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, LogOut, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { roleLabel } from "@/lib/auth";

export function TopBar() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user || user.role === "analytics") return;
    function load() {
      api.getNotifications(undefined, true).then((n) => setUnread(n.length)).catch(() => {});
    }
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [user]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim() && user?.role !== "analytics") {
      window.location.href = `/?q=${encodeURIComponent(query.trim())}`;
    }
  }

  if (!user) return null;

  return (
    <header className="panel-header sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5">
      {user.role !== "analytics" ? (
        <form onSubmit={handleSearch} className="relative min-w-[160px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Patient name or ID"
            className="input-field pl-9"
            aria-label="Search worklist"
          />
        </form>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Analytics & Operations</p>
          <p className="text-xs text-muted">{roleLabel(user.role)} dashboard</p>
        </div>
      )}

      {user.role !== "analytics" && (
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center border border-[var(--border)] bg-[var(--bg)] transition hover:bg-[var(--surface-raised)]"
          style={{ borderRadius: "var(--radius-md)" }}
          title="Alerts"
        >
          <Bell className="h-4 w-4 text-muted" strokeWidth={1.75} />
          {unread > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center px-0.5 font-mono text-[9px] font-bold"
              style={{ background: "var(--danger)", color: "#fff", borderRadius: "var(--radius-sm)" }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      )}

      <button
        type="button"
        onClick={logout}
        className="btn-secondary h-9 gap-2 px-3 text-sm"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </header>
  );
}
