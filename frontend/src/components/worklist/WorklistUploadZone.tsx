"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { api } from "@/lib/api";

const ACCEPT = ".dcm,.dicom,image/png,image/jpeg,image/jpg";
const HINT = "PNG, JPEG, or DICOM (.dcm) · max 50 MB per file";

interface WorklistUploadZoneProps {
  onUploaded: () => void;
  autoAnalyze?: boolean;
}

export function WorklistUploadZone({ onUploaded, autoAnalyze = false }: WorklistUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const uploadFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError("");
      setFileName(file.name);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("patient_id", `P-${Date.now().toString().slice(-6)}`);
      fd.append("patient_name", "Pending review");
      fd.append("modality", "XR");
      fd.append("body_part", "AUTO");
      fd.append("auto_analyze", autoAnalyze ? "true" : "false");

      try {
        await api.upload(fd);
        setFileName("");
        onUploaded();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(
          msg.includes("Cannot reach the API")
            ? "Upload failed — API unreachable. Confirm the backend is running and refresh the page."
            : `Upload failed — ${msg}`
        );
      } finally {
        setLoading(false);
      }
    },
    [onUploaded]
  );

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <section className="panel mb-4 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide">Upload study</h2>
          <p className="text-[11px] text-muted">{HINT}</p>
        </div>
        {loading && (
          <span className="flex items-center gap-1 text-[11px] text-muted">
            <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--ai)" }} />
            Uploading and running analysis…
          </span>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!loading) handleFiles(e.dataTransfer.files);
        }}
        className={`upload-zone ${dragOver ? "upload-zone-active" : ""} ${loading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
      >
        <Upload className="mx-auto mb-2 h-4 w-4" style={{ color: "var(--text-muted)" }} />
        <p className="text-xs font-medium">Drop scan here or click to browse</p>
        <p className="mt-1 text-[11px] text-muted">{HINT}</p>
        {fileName && !error && (
          <p className="mt-2 font-mono text-[11px]" style={{ color: "var(--ai)" }}>
            {fileName}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="mt-2 text-[11px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </section>
  );
}
