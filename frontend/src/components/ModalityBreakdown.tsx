import type { Stats } from "@/lib/types";

const MODALITY_LABELS: Record<string, string> = {
  XR: "X-Ray",
  CT: "CT Scan",
  MR: "MRI",
  US: "Ultrasound",
};

export function ModalityBreakdown({ stats }: { stats: Stats }) {
  const entries = Object.entries(stats.modalities);
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;

  if (entries.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Modality mix
        </h3>
        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>No studies yet</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        Modality mix
      </h3>
      <div
        className="mb-4 flex h-2 overflow-hidden"
        style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}
      >
        {entries.map(([mod, count], i) => (
          <div
            key={mod}
            style={{
              width: `${(count / total) * 100}%`,
              background: i % 2 === 0 ? "var(--primary)" : "var(--accent)",
              opacity: 0.7 + (i % 3) * 0.1,
            }}
            title={`${mod}: ${count}`}
          />
        ))}
      </div>
      <div className="space-y-2">
        {entries.map(([mod, count]) => (
          <div key={mod} className="flex items-center justify-between text-sm">
            <span className="font-medium">{MODALITY_LABELS[mod] ?? mod}</span>
            <span className="tabular-nums font-semibold">
              {count}{" "}
              <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                ({Math.round((count / total) * 100)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
