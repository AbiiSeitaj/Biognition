"use client";

import clsx from "clsx";
import { Brain, Database, Network, ScanLine } from "lucide-react";
import type { WorkflowStep } from "@/lib/types";

const ICONS = {
  upload: ScanLine,
  analyze: Brain,
  archive: Database,
  access: Network,
} as const;

const DEFAULT_STEPS: WorkflowStep[] = [
  { id: "upload", label: "Image upload", subtitle: "DICOM intake", count: 0 },
  { id: "analyze", label: "AI analysis", subtitle: "Modality models", count: 0 },
  { id: "archive", label: "PACS archive", subtitle: "Long-term storage", count: 0 },
  { id: "access", label: "Cross-dept access", subtitle: "Department routing", count: 0 },
];

export function SystemFlowDiagram({
  title = "System flow",
  steps = DEFAULT_STEPS,
  compact = false,
  activeStep,
}: {
  title?: string;
  steps?: WorkflowStep[];
  compact?: boolean;
  activeStep?: string;
}) {
  const resolvedActive =
    activeStep ??
    (steps[3]?.count > 0
      ? "access"
      : steps[2]?.count > 0
        ? "archive"
        : steps[1]?.count > 0
          ? "analyze"
          : "upload");

  return (
    <section className={clsx("panel overflow-hidden", compact ? "p-3" : "p-4")}>
      <h2 className={clsx("font-semibold uppercase tracking-wide text-muted", compact ? "mb-3 text-[10px]" : "mb-4 text-xs")}>
        {title}
      </h2>

      <div className="system-flow">
        {steps.map((step, index) => {
          const Icon = ICONS[step.id as keyof typeof ICONS] ?? ScanLine;
          const isPacs = step.id === "archive";
          const isActive = step.id === resolvedActive;
          const isComplete = step.count > 0 && step.id !== resolvedActive;

          return (
            <div key={step.id} className="system-flow-segment">
              {index > 0 && <div className="system-flow-connector" aria-hidden />}

              <div
                className={clsx(
                  "system-flow-step",
                  isPacs && "system-flow-step-pacs",
                  isActive && "system-flow-step-active",
                  isComplete && "system-flow-step-complete"
                )}
              >
                <div className="system-flow-icon">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <p className="system-flow-label">{step.label}</p>
                {!compact && <p className="system-flow-sub">{step.subtitle}</p>}
                {!compact && step.count > 0 && (
                  <p className="system-flow-count font-mono">{step.count}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
