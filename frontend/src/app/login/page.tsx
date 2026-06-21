"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";

const DEMO_ACCOUNTS = [
  { role: "Administrator", user: "admin", pass: "admin123", desc: "Full platform access — clinical, teams, analytics & admin" },
  { role: "Radiologist", user: "radiologist", pass: "rad123", desc: "Scan, AI analysis, approve reports" },
  { role: "Department Doctor", user: "doctor", pass: "doc123", desc: "Upload scans, view worklist & reports" },
  { role: "Analytics", user: "analytics", pass: "ana123", desc: "Operational metrics & AI performance" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(user: string, pass: string) {
    setUsername(user);
    setPassword(pass);
    setError("");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-[920px] grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="panel p-6">
          <div className="mb-6">
            <BrandLogo className="h-14" priority />
            <p className="mt-2 text-sm text-muted">PACS · AI-assisted radiology platform</p>
          </div>

          <div className="mb-4 rounded border border-[var(--border)] p-3" style={{ background: "var(--surface)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Platform objectives</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
              <li>Automatic AI analysis of XR, CT, MRI & ultrasound</li>
              <li>Anomaly detection with structured reports & risk scores</li>
              <li>PACS archiving with sync across departments & buildings</li>
              <li>Radiologist sign-off before clinical delivery</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Username</label>
              <input
                className="input-field w-full"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Password</label>
              <input
                type="password"
                className="input-field w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="text-xs" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Demo roles</p>
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.user}
              type="button"
              onClick={() => fillDemo(acc.user, acc.pass)}
              className="panel w-full p-4 text-left transition hover:border-[var(--ai)]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{acc.role}</p>
                <span className="font-mono text-[10px] text-muted">{acc.user}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{acc.desc}</p>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}
