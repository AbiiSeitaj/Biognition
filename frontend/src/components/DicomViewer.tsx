"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FlipHorizontal,
  Layers,
  Loader2,
  RotateCcw,
  SunMedium,
  X,
} from "lucide-react";
import type { Study } from "@/lib/types";
import { api } from "@/lib/api";
import { getCornerstone } from "@/lib/cornerstone/setup";

interface DicomViewerProps {
  study: Study;
}

const VIEWER_HELP_KEY = "drscan-viewer-help-dismissed";

type ViewerMode = "cornerstone" | "frame";

export function DicomViewer({ study }: DicomViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapRef = useRef<HTMLImageElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const frameBlobUrlRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewerMode, setViewerMode] = useState<ViewerMode>("cornerstone");
  const [showOverlay, setShowOverlay] = useState(true);
  const [invert, setInvert] = useState(false);
  const [voi, setVoi] = useState({ ww: 400, wc: 40 });
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    setShowHelp(localStorage.getItem(VIEWER_HELP_KEY) !== "1");
  }, []);

  function dismissHelp() {
    localStorage.setItem(VIEWER_HELP_KEY, "1");
    setShowHelp(false);
  }

  const hasHeatmap = Boolean(study.report?.overlay_url);

  const drawHeatmapOverlay = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;
    const heatmap = heatmapRef.current;
    const container = containerRef.current;
    if (!overlayCanvas || !container) return;

    if (viewerMode === "frame") {
      const frameCanvas = frameCanvasRef.current;
      if (!frameCanvas) return;
      overlayCanvas.width = frameCanvas.width;
      overlayCanvas.height = frameCanvas.height;
      const ctx = overlayCanvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      if (!showOverlay || !heatmap) return;
      ctx.drawImage(heatmap, 0, 0, overlayCanvas.width, overlayCanvas.height);
      return;
    }

    const element = viewportRef.current;
    if (!element) return;

    getCornerstone().then(({ cornerstone }) => {
      let enabledElement: ReturnType<typeof cornerstone.getEnabledElement> | undefined;
      try {
        enabledElement = cornerstone.getEnabledElement(element);
      } catch {
        return;
      }
      if (!enabledElement) return;

      const { viewport, canvas, image } = enabledElement;
      overlayCanvas.width = canvas.width;
      overlayCanvas.height = canvas.height;
      const ctx = overlayCanvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!showOverlay || !heatmap || !image) return;

      const imageWidth = image.width ?? image.columns;
      const imageHeight = image.height ?? image.rows;
      if (!imageWidth || !imageHeight) return;

      ctx.save();
      ctx.translate(canvas.width / 2 + viewport.translation.x, canvas.height / 2 + viewport.translation.y);
      ctx.scale(viewport.scale, viewport.scale);
      ctx.drawImage(heatmap, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
      ctx.restore();
    });
  }, [showOverlay, viewerMode]);

  const resizeCornerstone = useCallback(async (element: HTMLElement) => {
    const { cornerstone } = await getCornerstone();
    cornerstone.resize(element, true);
    cornerstone.fitToWindow(element);
  }, []);

  const activateTools = useCallback(async (element: HTMLElement) => {
    const { cornerstoneTools } = await getCornerstone();
    const toolClasses = [
      cornerstoneTools.WwwcTool,
      cornerstoneTools.PanTool,
      cornerstoneTools.ZoomTool,
      cornerstoneTools.ZoomMouseWheelTool,
    ];
    toolClasses.forEach((Tool) => cornerstoneTools.addToolForElement(element, Tool));
    cornerstoneTools.setToolActiveForElement(element, "Wwwc", { mouseButtonMask: 1 });
    cornerstoneTools.setToolActiveForElement(element, "Pan", { mouseButtonMask: 2 });
    cornerstoneTools.setToolActiveForElement(element, "Zoom", { mouseButtonMask: 4 });
    cornerstoneTools.setToolActiveForElement(element, "ZoomMouseWheel", {});
  }, []);

  const renderFrameFallback = useCallback(
    async (windowCenter: number, windowWidth: number, inverted: boolean) => {
      const canvas = frameCanvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const blob = await api.fetchFrame(study.id, windowCenter, windowWidth);
      if (frameBlobUrlRef.current) URL.revokeObjectURL(frameBlobUrlRef.current);
      const url = URL.createObjectURL(blob);
      frameBlobUrlRef.current = url;

      const img = await loadImage(url);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const x = (canvas.width - drawW) / 2;
      const y = (canvas.height - drawH) / 2;

      ctx.save();
      if (inverted) {
        ctx.filter = "invert(1)";
      }
      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.restore();

      drawHeatmapOverlay();
    },
    [study.id, drawHeatmapOverlay]
  );

  useEffect(() => {
    const containerEl = containerRef.current;
    const viewportEl = viewportRef.current;
    if (!containerEl || !viewportEl) return;

    let cancelled = false;
    let onRendered: ((e: Event) => void) | undefined;
    let resizeObserver: ResizeObserver | undefined;

    async function loadCornerstone(vp: HTMLDivElement, box: HTMLDivElement) {
      const { cornerstone } = await getCornerstone();
      cornerstone.enable(vp);

      const buffer = await (await api.fetchDicom(study.id)).arrayBuffer();
      const blob = new Blob([buffer], { type: "application/dicom" });
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;

      const image = await cornerstone.loadImage(`wadouri:${blobUrl}`);
      if (cancelled) return;

      cornerstone.displayImage(vp, image);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      cornerstone.resize(vp, true);
      cornerstone.fitToWindow(vp);

      const enabled = cornerstone.getEnabledElement(vp);
      if (!enabled?.canvas?.width || !enabled?.canvas?.height) {
        throw new Error("Viewer canvas not ready");
      }

      const vpSettings = cornerstone.getViewport(vp);
      setVoi({ ww: Math.round(vpSettings.voi.windowWidth), wc: Math.round(vpSettings.voi.windowCenter) });

      await activateTools(vp);

      onRendered = () => {
        try {
          const v = cornerstone.getViewport(vp);
          setVoi({ ww: Math.round(v.voi.windowWidth), wc: Math.round(v.voi.windowCenter) });
        } catch {
          /* ignore */
        }
        drawHeatmapOverlay();
      };
      vp.addEventListener("cornerstoneimagerendered", onRendered);

      resizeObserver = new ResizeObserver(() => {
        if (cancelled) return;
        try {
          cornerstone.resize(vp, true);
          cornerstone.fitToWindow(vp);
          drawHeatmapOverlay();
        } catch {
          /* ignore */
        }
      });
      resizeObserver.observe(box);
    }

    async function loadHeatmap() {
      if (!hasHeatmap || cancelled) return;
      try {
        const heatBlob = await api.fetchHeatmap(study.id);
        const heatUrl = URL.createObjectURL(heatBlob);
        const img = await loadImage(heatUrl);
        URL.revokeObjectURL(heatUrl);
        if (cancelled) return;
        heatmapRef.current = img;
        drawHeatmapOverlay();
      } catch {
        /* heatmap optional */
      }
    }

    async function load() {
      setLoading(true);
      setError("");
      setViewerMode("cornerstone");

      try {
        await loadCornerstone(viewportEl!, containerEl!);
        if (!cancelled) {
          setViewerMode("cornerstone");
          await loadHeatmap();
        }
      } catch (err) {
        if (cancelled) return;
        try {
          setViewerMode("frame");
          await renderFrameFallback(40, 400, false);
          await loadHeatmap();
        } catch (fallbackErr) {
          setError(
            fallbackErr instanceof Error
              ? fallbackErr.message
              : err instanceof Error
                ? err.message
                : "Failed to load scan"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (onRendered) {
        viewportEl.removeEventListener("cornerstoneimagerendered", onRendered);
      }
      getCornerstone().then(({ cornerstone }) => {
        try {
          cornerstone.disable(viewportEl);
        } catch {
          /* ignore */
        }
      });
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (frameBlobUrlRef.current) {
        URL.revokeObjectURL(frameBlobUrlRef.current);
        frameBlobUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when study changes
  }, [study.id, hasHeatmap]);

  useEffect(() => {
    drawHeatmapOverlay();
  }, [showOverlay, drawHeatmapOverlay]);

  const resetView = useCallback(async () => {
    setInvert(false);
    if (viewerMode === "frame") {
      await renderFrameFallback(voi.wc, voi.ww, false);
      return;
    }
    const element = viewportRef.current;
    if (!element) return;
    const { cornerstone } = await getCornerstone();
    cornerstone.reset(element);
    await resizeCornerstone(element);
    const vp = cornerstone.getViewport(element);
    vp.invert = false;
    cornerstone.setViewport(element, vp);
    drawHeatmapOverlay();
  }, [viewerMode, renderFrameFallback, voi.wc, voi.ww, resizeCornerstone, drawHeatmapOverlay]);

  const toggleInvert = useCallback(async () => {
    const next = !invert;
    setInvert(next);
    if (viewerMode === "frame") {
      await renderFrameFallback(voi.wc, voi.ww, next);
      return;
    }
    const element = viewportRef.current;
    if (!element) return;
    const { cornerstone } = await getCornerstone();
    const vp = cornerstone.getViewport(element);
    vp.invert = next;
    cornerstone.setViewport(element, vp);
    drawHeatmapOverlay();
  }, [invert, viewerMode, renderFrameFallback, voi.wc, voi.ww, drawHeatmapOverlay]);

  const setWindow = useCallback(
    async (windowCenter: number, windowWidth: number) => {
      setVoi({ wc: windowCenter, ww: windowWidth });
      if (viewerMode === "frame") {
        await renderFrameFallback(windowCenter, windowWidth, invert);
        return;
      }
      const element = viewportRef.current;
      if (!element) return;
      const { cornerstone } = await getCornerstone();
      const vp = cornerstone.getViewport(element);
      vp.voi.windowCenter = windowCenter;
      vp.voi.windowWidth = windowWidth;
      cornerstone.setViewport(element, vp);
      drawHeatmapOverlay();
    },
    [viewerMode, renderFrameFallback, invert, drawHeatmapOverlay]
  );

  const downloadDicom = useCallback(async () => {
    try {
      const blob = await api.fetchDicom(study.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${study.study_uid}.dcm`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  }, [study.id, study.study_uid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r") resetView();
      if (e.key === "o") setShowOverlay((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetView]);

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="panel-header flex flex-wrap items-center gap-2 px-3 py-2">
        <ToolBtn icon={RotateCcw} label="Reset" onClick={resetView} />
        <ToolBtn icon={FlipHorizontal} label="Invert" onClick={toggleInvert} active={invert} />
        {hasHeatmap && (
          <ToolBtn
            icon={Layers}
            label="Show markers"
            onClick={() => setShowOverlay((v) => !v)}
            active={showOverlay}
          />
        )}
        <Divider />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-base font-medium">
            <SunMedium className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
            Brightness
            <input
              type="range"
              min={-500}
              max={500}
              value={voi.wc}
              onChange={(e) => setWindow(Number(e.target.value), voi.ww)}
              aria-label="Brightness"
              className="h-3 w-36"
              style={{ accentColor: "var(--primary)" }}
            />
          </label>
          <label className="flex items-center gap-2 text-base font-medium">
            Contrast
            <input
              type="range"
              min={1}
              max={2000}
              value={voi.ww}
              onChange={(e) => setWindow(voi.wc, Number(e.target.value))}
              aria-label="Contrast"
              className="h-3 w-36"
              style={{ accentColor: "var(--primary)" }}
            />
          </label>
        </div>
        <div className="ml-auto">
          <button type="button" onClick={downloadDicom} className="btn-secondary">
            <Download className="h-4 w-4" />
            Download file
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="viewer-grid relative h-[55vh] min-h-[420px] w-full bg-black"
      >
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary)" }} />
            <span className="ml-3 text-base text-slate-200">Loading image…</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 p-6 text-center text-base text-red-200">
            {error}
          </div>
        )}

        <div
          ref={viewportRef}
          className={`absolute inset-0 h-full w-full ${viewerMode === "frame" ? "hidden" : ""}`}
          onContextMenu={(e) => e.preventDefault()}
        />
        <canvas
          ref={frameCanvasRef}
          className={`absolute inset-0 h-full w-full ${viewerMode === "cornerstone" ? "hidden" : ""}`}
        />
        <canvas
          ref={overlayCanvasRef}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        />

        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-black/70 px-3 py-1.5 text-xs text-white">
          <div className="font-semibold">{study.patient.name}</div>
          <div className="text-slate-300">
            {study.patient.patient_id} · {study.modality}
          </div>
        </div>

        {showHelp && (
          <div
            className="absolute bottom-3 left-3 right-3 z-20 flex items-start gap-2 px-3 py-2 text-sm text-slate-100"
            style={{ background: "rgba(0,0,0,0.78)", borderRadius: "var(--radius-md)" }}
          >
            <p className="flex-1 leading-snug">
              <strong>Controls:</strong> Left drag = brightness · Middle drag = pan · Right drag = zoom ·
              Scroll = zoom
            </p>
            <button
              type="button"
              onClick={dismissHelp}
              className="shrink-0 rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Close help"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = url;
  });
}

function ToolBtn({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 px-2.5 text-sm font-medium transition ${
        active
          ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]"
          : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-muted)]"
      }`}
      style={{ borderRadius: "var(--radius-pill)" }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 hidden h-8 w-px sm:block" style={{ background: "var(--border)" }} />;
}
