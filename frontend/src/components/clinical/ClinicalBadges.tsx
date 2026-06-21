import clsx from "clsx";

export function ModalityBadge({ modality }: { modality: string }) {
  return <span className="modality-badge">{modality}</span>;
}

export function StudyStatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "-");
  const map: Record<string, string> = {
    pending: "status-pending",
    "pending-analysis": "status-pending",
    analyzed: "status-analyzed",
    approved: "status-approved",
    archived: "status-archived",
  };
  return (
    <span className={clsx("status-badge", map[key] ?? "status-pending")}>
      {status}
    </span>
  );
}

export function RiskBadge({
  level,
  score,
  showAiTag = false,
  size: _size,
}: {
  level: string;
  score?: number;
  showAiTag?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const key = (level || "low").toLowerCase();
  const isCritical = key === "high" || key === "critical";

  return (
    <span
      className={clsx(
        "risk-badge",
        isCritical && (key === "critical" ? "risk-badge-critical" : "risk-badge-high")
      )}
    >
      {score !== undefined && <span>{Math.round(score * 100)}%</span>}
      <span>{level}</span>
      {showAiTag && <span className="ai-tag ml-0">AI</span>}
    </span>
  );
}
