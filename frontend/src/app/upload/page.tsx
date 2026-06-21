import { UploadForm } from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <header className="mb-4 border-b border-[var(--border)] pb-3">
        <h1 className="text-sm font-semibold uppercase tracking-wide">Upload Scan</h1>
        <p className="mt-0.5 text-xs text-muted">
          Enter patient details, choose scan type, and submit for AI analysis and report generation.
        </p>
      </header>
      <UploadForm />
    </div>
  );
}
