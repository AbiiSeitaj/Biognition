import clsx from "clsx";

const styles = {
  low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  moderate: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  high: "bg-red-500/20 text-red-300 border-red-500/30 risk-glow-high",
  critical: "bg-red-600/30 text-red-200 border-red-400/50 risk-glow-high animate-pulse",
};

export function RiskBadge({
  level,
  score,
  size = "md",
}: {
  level: string;
  score?: number;
  size?: "sm" | "md" | "lg";
}) {
  const key = (level?.toLowerCase() || "low") as keyof typeof styles;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide",
        styles[key] || styles.low,
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-3 py-1 text-xs",
        size === "lg" && "px-4 py-2 text-sm"
      )}
    >
      {score !== undefined && <span>{Math.round(score * 100)}%</span>}
      {level}
    </span>
  );
}
