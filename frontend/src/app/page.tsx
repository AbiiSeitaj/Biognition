import { Suspense } from "react";
import { WorklistScreen } from "@/components/worklist/WorklistScreen";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-xs text-muted">Loading worklist…</div>
      }
    >
      <WorklistScreen />
    </Suspense>
  );
}
