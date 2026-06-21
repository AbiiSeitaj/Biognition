"use client";

import { useState } from "react";
import { Brain, Loader2, Send } from "lucide-react";
import type { Study } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "Summarize the key findings",
  "What is the risk level and why?",
  "What follow-up do you recommend?",
  "Explain the AI confidence scores",
  "Which department was alerted?",
  "What does the heatmap show?",
];

export function AIAssistant({ study }: { study: Study }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: study.report
        ? `I've analyzed ${study.patient.name}'s ${study.modality} study (${study.body_part}). Ask me about findings, risk, or recommendations.`
        : "Run AI analysis first, then I can help explain the results.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  async function send(text: string) {
    if (!text.trim() || thinking) return;
    const question = text.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setThinking(true);

    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    const reply = generateReply(question, study);
    setMessages((m) => [...m, { role: "assistant", content: reply }]);
    setThinking(false);
  }

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div
        className="panel-header flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
      >
        <div className="logo-mark h-9 w-9">
          <Brain className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Study assistant</h3>
          <p className="text-xs opacity-80">Study #{study.id}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={m.role === "user" ? "chat-bubble-user max-w-[85%]" : "chat-bubble-ai max-w-[90%]"}>
              {m.content}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="chat-bubble-ai flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--primary)" }} />
              Analyzing…
            </div>
          </div>
        )}
      </div>

      {study.report && (
        <div className="border-t border-[var(--border)] px-4 py-2">
          <div className="flex flex-wrap gap-1.5">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="px-2.5 py-1 text-[11px] font-medium transition hover:opacity-80"
                style={{
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-muted)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-[var(--border)] p-3"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={study.report ? "Ask about this study…" : "Analysis required first"}
            disabled={!study.report || thinking}
            className="input-field flex-1 text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!study.report || thinking || !input.trim()}
            className="btn-primary px-3"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
          <Brain className="h-3 w-3" />
          AI-assisted — requires radiologist verification
        </p>
      </form>
    </div>
  );
}

function generateReply(question: string, study: Study): string {
  const report = study.report;
  if (!report) return "Please run AI analysis on this study first.";

  const q = question.toLowerCase();
  const riskPct = Math.round(report.risk_score * 100);

  if (q.includes("summar") || q.includes("overview") || q.includes("key")) {
    const top = report.anomalies.slice(0, 2).map((a) => a.label).join(", ");
    return `Summary for ${study.patient.name}: ${study.modality} ${study.body_part} shows ${report.risk_level} risk (${riskPct}%). ${
      top ? `Primary detections: ${top}.` : report.findings.slice(0, 200)
    }`;
  }

  if (q.includes("risk") || q.includes("why") || q.includes("level")) {
    const factors = report.anomalies.length
      ? report.anomalies.map((a) => `${a.label} (${Math.round(a.confidence * 100)}%, ${a.severity})`).join("; ")
      : "pattern analysis across the full image";
    return `Risk is ${report.risk_level} at ${riskPct}% based on: ${factors}. ${report.impression.split("\n")[0]}`;
  }

  if (q.includes("follow") || q.includes("recommend") || q.includes("next")) {
    return report.recommendations;
  }

  if (q.includes("confidence") || q.includes("score") || q.includes("accur")) {
    if (report.anomalies.length === 0) {
      return `Overall model confidence for this study is reflected in the ${riskPct}% risk score. No localized anomalies were flagged above threshold.`;
    }
    return report.anomalies
      .map((a) => `${a.label}: ${Math.round(a.confidence * 100)}% confidence in ${a.region.replace(/_/g, " ")} (${a.severity} severity)`)
      .join(". ");
  }

  if (q.includes("heatmap") || q.includes("overlay") || q.includes("grad")) {
    const regions = report.anomalies.map((a) => a.region.replace(/_/g, " ")).join(", ");
    return regions
      ? `The GradCAM heatmap highlights ${regions}. Highest-confidence regions drive the ${riskPct}% risk score. Toggle overlay in the viewer to see alignment with anatomy.`
      : `No localized heatmap regions exceeded threshold. The model assessed global patterns for a ${report.risk_level} risk (${riskPct}%).`;
  }

  if (q.includes("department") || q.includes("alert") || q.includes("rout")) {
    const note = report.impression.match(/Stage 1 —[^\n]+/)?.[0];
    return note
      ? `${note} Check Urgent alerts for unread notifications tied to this study.`
      : `Risk level ${report.risk_level} triggers routing to clinical teams when thresholds are met. See Team access for department-specific feeds.`;
  }

  if (q.includes("finding")) {
    return report.findings;
  }

  return `Based on the ${study.modality} analysis: ${report.impression.split("\n").slice(-1)[0] || report.impression}. Risk: ${riskPct}% (${report.risk_level}). For specifics, ask about findings, risk factors, or recommendations.`;
}
