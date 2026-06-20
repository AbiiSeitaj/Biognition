"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Loader2, Upload } from "lucide-react";
import { api } from "@/lib/api";

const MODALITIES = [
  { value: "XR", label: "X-Ray" },
  { value: "CT", label: "CT Scan" },
  { value: "MR", label: "MRI" },
  { value: "US", label: "Ultrasound" },
];

const BODY_PARTS = [
  { value: "AUTO", label: "Auto-detect body part (recommended)" },
  { value: "CHEST", label: "Chest / Thorax" },
  { value: "CERVICAL SPINE", label: "Cervical spine / Neck" },
  { value: "LUMBAR SPINE", label: "Lumbar spine" },
  { value: "EXTREMITY", label: "Hand / wrist / knee / ankle" },
];

export function UploadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoAnalyze, setAutoAnalyze] = useState(true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      const { study } = await api.upload(fd);
      if (autoAnalyze) {
        await api.analyze(study.id);
      }
      router.push(`/viewer/${study.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass-panel mx-auto max-w-xl space-y-5 p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
          <Upload className="h-7 w-7 text-cyan-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Upload Medical Image</h2>
        <p className="mt-1 text-sm text-slate-400">
          DICOM (.dcm), PNG, or JPEG — auto-converted to PACS-ready DICOM
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Patient ID" name="patient_id" defaultValue="P-NEW-001" />
        <Field label="Patient Name" name="patient_name" defaultValue="" placeholder="Full name" />
        <Field label="Age" name="patient_age" type="number" placeholder="45" />
        <Field label="Sex" name="patient_sex" placeholder="M / F" />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Modality</label>
        <select
          name="modality"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
        >
          {MODALITIES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Body part / Study region</label>
        <select
          name="body_part"
          defaultValue="AUTO"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
        >
          {BODY_PARTS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[10px] text-cyan-400/80">
          Stage 1 AI detects anatomy, then routes to chest (TorchXRayVision) or spine/MSK (RadImageNet) models.
        </p>
      </div>

      <Field label="Study Description" name="description" placeholder="Clinical indication..." />

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Image File</label>
        <input
          type="file"
          name="file"
          required
          accept=".dcm,.dicom,image/*"
          className="w-full rounded-lg border border-dashed border-white/20 bg-black/20 px-3 py-6 text-sm text-slate-400 file:mr-4 file:rounded file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={autoAnalyze}
          onChange={(e) => setAutoAnalyze(e.target.checked)}
          className="rounded accent-cyan-500"
        />
        <Brain className="h-4 w-4 text-cyan-400" />
        Run AI analysis &amp; archive to PACS automatically
      </label>

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {loading ? "Processing..." : "Upload & Analyze"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
      />
    </div>
  );
}
