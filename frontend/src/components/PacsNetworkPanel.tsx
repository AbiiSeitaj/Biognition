"use client";

import { Building2, Server } from "lucide-react";
import type { PacsNodeInfo } from "@/lib/types";

export function PacsNetworkPanel({ nodes, buildings }: { nodes: PacsNodeInfo[]; buildings: number }) {
  if (nodes.length === 0) {
    return (
      <section className="panel p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">PACS network</h3>
        <p className="mt-2 text-xs text-muted">No PACS nodes configured.</p>
      </section>
    );
  }

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">PACS across buildings</h3>
        <span className="font-mono text-[10px] text-muted">
          {buildings} sites · {nodes.length} nodes
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="flex gap-3 border border-[var(--border)] p-3"
            style={{
              borderRadius: "var(--radius)",
              background: node.is_primary ? "var(--ai-soft)" : "var(--bg)",
            }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center"
              style={{
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                color: node.is_primary ? "var(--ai)" : "var(--text-muted)",
              }}
            >
              {node.is_primary ? <Server className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold capitalize">{node.department}</p>
              <p className="truncate text-[10px] text-muted">{node.campus}</p>
              <p className="mt-1 font-mono text-[10px] text-muted">
                {node.synced_studies} studies synced
                {node.is_primary ? " · primary" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
