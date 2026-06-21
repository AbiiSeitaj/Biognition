import clsx from "clsx";

export function AiTag() {
  return <span className="ai-tag">AI</span>;
}

export function AiInlineDiff({
  aiValue,
  currentValue,
  showAiTag = true,
  mono = true,
}: {
  aiValue: string;
  currentValue: string;
  showAiTag?: boolean;
  mono?: boolean;
}) {
  const changed = aiValue.trim() !== currentValue.trim();

  if (!changed) {
    return (
      <span className={clsx(mono && "ai-value")}>
        {aiValue}
        {showAiTag && <AiTag />}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <span className="ai-value-struck">{aiValue}</span>
      <span className={clsx("clinician-value", mono && "font-mono")}>{currentValue}</span>
    </span>
  );
}

export function AiValue({
  children,
  tag = true,
}: {
  children: React.ReactNode;
  tag?: boolean;
}) {
  return (
    <span className="ai-value">
      {children}
      {tag && <AiTag />}
    </span>
  );
}
