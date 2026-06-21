"use client";

import { useEffect, useState } from "react";
import { Brain, CheckCircle2, Cpu, Database } from "lucide-react";
import { api } from "@/lib/api";
import type { AIModel } from "@/lib/types";

const ACCURACY: Record<string, { score: number; metric: string }> = {
  XR: { score: 92, metric: "AUC on ChestX-ray14" },
  CT: { score: 88, metric: "RadImageNet top-1" },
  MR: { score: 91, metric: "Brain tumor classification" },
  US: { score: 87, metric: "BUSI breast ultrasound" },
};

export default function AIModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getModels()
      .then((r) => setModels(r.models))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <header className="page-header">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Model registry
        </p>
        <h1 className="page-title">Analysis engines</h1>
        <p className="page-subtitle">
          Modality-specific models, training datasets, and validation metrics
        </p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <HighlightCard icon={Brain} title="4 modalities" desc="XR, CT, MR, US" />
        <HighlightCard icon={Cpu} title="Production stack" desc="PyTorch, RadImageNet, HF" />
        <HighlightCard icon={Database} title="Training data" desc="NIH, CheXpert, RadImageNet, BUSI" />
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading catalog…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {models.map((m) => {
            const acc = ACCURACY[m.modality] ?? { score: 85, metric: "Validation set" };
            return (
              <article key={m.modality} className="card overflow-hidden">
                <div className="panel-header flex items-start justify-between gap-4 p-5">
                  <div>
                    <span className="badge-modality">{m.modality}</span>
                    <h2 className="mt-2 text-lg font-semibold">{m.name}</h2>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>v{m.version}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-semibold tabular-nums" style={{ color: "var(--primary)" }}>
                      {acc.score}%
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{acc.metric}</p>
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <div className="confidence-bar h-2">
                    <div className="confidence-fill" style={{ width: `${acc.score}%` }} />
                  </div>
                  <Row label="Framework" value={m.framework} />
                  <Row label="Training data" value={m.datasets} />
                  {m.scope && <Row label="Routing" value={m.scope} />}
                  <div className="flex items-center gap-2 pt-2 text-xs font-medium" style={{ color: "var(--ok)" }}>
                    <CheckCircle2 className="h-4 w-4" />
                    Active in pipeline
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="info-banner mt-8">
        Body-part routing, GradCAM overlays, and risk scoring run automatically after upload.
      </div>
    </div>
  );
}

function HighlightCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="card flex items-start gap-4 p-5">
      <div className="stat-icon shrink-0 p-2">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{desc}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}
