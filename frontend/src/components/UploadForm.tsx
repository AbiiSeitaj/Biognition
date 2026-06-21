"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, FileImage, Loader2, Upload } from "lucide-react";
import { api } from "@/lib/api";

const MODALITIES = [
  { value: "XR", label: "X-Ray" },
  { value: "CT", label: "CT Scan" },
  { value: "MR", label: "MRI" },
  { value: "US", label: "Ultrasound" },
];

const BODY_PARTS = [
  { value: "AUTO", label: "Auto-detect (recommended)" },
  { value: "CHEST", label: "Chest / Thorax" },
  { value: "CERVICAL SPINE", label: "Cervical spine / Neck" },
  { value: "LUMBAR SPINE", label: "Lumbar spine" },
  { value: "EXTREMITY", label: "Hand / wrist / knee / ankle" },
];

export function UploadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("auto_analyze", "true");

    try {
      const { study } = await api.upload(fd);
      router.push(`/viewer/${study.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const input = document.getElementById("file") as HTMLInputElement;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        setFileName(file.name);
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel mx-auto max-w-2xl space-y-4 p-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="border border-dashed p-6 text-center transition"
        style={{
          borderRadius: "var(--radius)",
          borderColor: dragOver ? "var(--ai)" : "var(--border)",
          background: dragOver ? "var(--ai-soft)" : "var(--bg)",
        }}
      >
        <FileImage className="mx-auto mb-3 h-8 w-8 text-muted" />
        <p className="text-xs font-medium">Drop DICOM or image here</p>
        <p className="mt-1 text-[10px] text-muted">PNG, JPEG, or DICOM · max 50 MB</p>
        <label className="btn-primary mx-auto mt-3 cursor-pointer">
          <Upload className="h-3.5 w-3.5" />
          Browse file
          <input
            id="file"
            type="file"
            name="file"
            required
            accept=".dcm,.dicom,image/png,image/jpeg,image/jpg"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </label>
        {fileName && <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--ai)" }}>{fileName}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Patient ID" name="patient_id" defaultValue={`P-${Date.now().toString().slice(-6)}`} />
        <Field label="Patient name" name="patient_name" placeholder="Full name" required />
        <Field label="Age" name="patient_age" type="number" placeholder="45" />
        <Field label="Sex" name="patient_sex" placeholder="M / F" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="modality" className="label-field">
            Scan type
          </label>
          <select id="modality" name="modality" defaultValue="XR" className="select-field">
            {MODALITIES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="body_part" className="label-field">
            Body area
          </label>
          <select id="body_part" name="body_part" defaultValue="AUTO" className="select-field">
            {BODY_PARTS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Field label="Clinical notes (optional)" name="description" placeholder="Reason for scan…" />

      <p className="flex items-center gap-2 text-[10px] text-muted">
        <Brain className="h-3.5 w-3.5" style={{ color: "var(--ai)" }} />
        AI will analyze the scan and generate a structured report with risk score.
      </p>

      {error && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {loading ? "Running AI analysis…" : "Submit scan for AI report"}
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
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="label-field">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="input-field"
      />
    </div>
  );
}
