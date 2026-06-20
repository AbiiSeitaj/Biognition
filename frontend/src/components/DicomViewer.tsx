"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FlipHorizontal,
  Layers,
  Loader2,
  Maximize2,
  RotateCcw,
  SunMedium,
} from "lucide-react";
import type { Study } from "@/lib/types";
import { api } from "@/lib/api";
import { getCornerstone } from "@/lib/cornerstone/setup";

interface DicomViewerProps {
  study: Study;
}

export function DicomViewer({ study }: DicomViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapRef = useRef<HTMLImageElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const imageIdRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOverlay, setShowOverlay] = useState(true);
  const [invert, setInvert] = useState(false);
  const [voi, setVoi] = useState({ ww: 400, wc: 40 });

  const overlaySrc = study.report?.overlay_url ? api.heatmapUrl(study.id) : null;

  const drawOverlay = useCallback(() => {
    const element = viewportRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const heatmap = heatmapRef.current;
    if (!element || !overlayCanvas) return;

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
  }, [showOverlay]);

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

  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;
    const element: HTMLDivElement = viewportEl;

    let cancelled = false;
    let onRendered: ((e: Event) => void) | undefined;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const { cornerstone } = await getCornerstone();

        cornerstone.enable(element);

        const res = await fetch(api.dicomUrl(study.id));
        if (!res.ok) throw new Error("Failed to load DICOM");
        const buffer = await res.arrayBuffer();
        const blob = new Blob([buffer], { type: "application/dicom" });
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;

        const imageId = `wadouri:${blobUrl}`;
        imageIdRef.current = imageId;

        const image = await cornerstone.loadImage(imageId);
        if (cancelled) return;

        cornerstone.displayImage(element, image);
        cornerstone.fitToWindow(element);

        const vp = cornerstone.getViewport(element);
        setVoi({ ww: Math.round(vp.voi.windowWidth), wc: Math.round(vp.voi.windowCenter) });

        await activateTools(element);

        onRendered = () => {
          try {
            const v = cornerstone.getViewport(element);
            setVoi({ ww: Math.round(v.voi.windowWidth), wc: Math.round(v.voi.windowCenter) });
          } catch {
            /* ignore */
          }
          drawOverlay();
        };
        element.addEventListener("cornerstoneimagerendered", onRendered);

        if (overlaySrc) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            heatmapRef.current = img;
            drawOverlay();
          };
          img.onerror = () => {
            /* Older analyses may lack heatmap-only file; overlay toggle stays hidden */
          };
          img.src = overlaySrc;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to initialize Cornerstone viewer");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (onRendered) {
        element.removeEventListener("cornerstoneimagerendered", onRendered);
      }
      getCornerstone().then(({ cornerstone }) => {
        try {
          cornerstone.disable(element);
        } catch {
          /* ignore */
        }
      });
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [study.id, overlaySrc, activateTools, drawOverlay]);

  useEffect(() => {
    drawOverlay();
  }, [showOverlay, drawOverlay]);

  const resetView = useCallback(async () => {
    const element = viewportRef.current;
    if (!element) return;
    const { cornerstone } = await getCornerstone();
    cornerstone.reset(element);
    cornerstone.fitToWindow(element);
    setInvert(false);
    const vp = cornerstone.getViewport(element);
    vp.invert = false;
    cornerstone.setViewport(element, vp);
    drawOverlay();
  }, [drawOverlay]);

  const toggleInvert = useCallback(async () => {
    const element = viewportRef.current;
    if (!element) return;
    const { cornerstone } = await getCornerstone();
    const vp = cornerstone.getViewport(element);
    vp.invert = !vp.invert;
    cornerstone.setViewport(element, vp);
    setInvert(vp.invert);
    drawOverlay();
  }, [drawOverlay]);

  const setWindow = useCallback(
    async (windowCenter: number, windowWidth: number) => {
      const element = viewportRef.current;
      if (!element) return;
      const { cornerstone } = await getCornerstone();
      const vp = cornerstone.getViewport(element);
      vp.voi.windowCenter = windowCenter;
      vp.voi.windowWidth = windowWidth;
      cornerstone.setViewport(element, vp);
      setVoi({ wc: windowCenter, ww: windowWidth });
      drawOverlay();
    },
    [drawOverlay]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r") resetView();
      if (e.key === "o") setShowOverlay((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetView]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-medical-900/80 px-3 py-2">
        <ToolBtn icon={RotateCcw} label="Reset view" onClick={resetView} />
        <ToolBtn icon={FlipHorizontal} label="Invert" onClick={toggleInvert} active={invert} />
        {overlaySrc && (
          <ToolBtn
            icon={Layers}
            label="AI heatmap overlay"
            onClick={() => setShowOverlay((v) => !v)}
            active={showOverlay}
          />
        )}
        <Divider />
        <div className="flex items-center gap-2">
          <SunMedium className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-[10px] text-slate-500">W/L</span>
          <input
            type="range"
            min={-500}
            max={500}
            value={voi.wc}
            onChange={(e) => setWindow(Number(e.target.value), voi.ww)}
            className="h-1 w-20 accent-cyan-500"
          />
          <input
            type="range"
            min={1}
            max={2000}
            value={voi.ww}
            onChange={(e) => setWindow(voi.wc, Number(e.target.value))}
            className="h-1 w-20 accent-cyan-500"
          />
          <span className="font-mono text-[10px] text-slate-500">
            {voi.wc}/{voi.ww}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-400">Cornerstone PACS</span>
          <a
            href={api.dicomUrl(study.id)}
            download
            className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-slate-300 hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" /> DICOM
          </a>
        </div>
      </div>

      <div className="viewer-grid relative min-h-0 flex-1 bg-black">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <span className="ml-2 text-sm text-slate-400">Loading DICOM…</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 p-6 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="relative h-full w-full">
          <div
            ref={viewportRef}
            className="absolute inset-0 h-full w-full"
            onContextMenu={(e) => e.preventDefault()}
          />
          <canvas
            ref={overlayCanvasRef}
            className="pointer-events-none absolute left-0 top-0 z-10"
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded bg-black/70 px-2 py-1 font-mono text-[10px] text-cyan-300">
          <div>{study.patient.name}</div>
          <div className="text-slate-400">
            {study.patient.patient_id} · {study.modality}
          </div>
        </div>
        <div className="pointer-events-none absolute right-3 top-3 z-20 rounded bg-black/70 px-2 py-1 font-mono text-[10px] text-slate-400">
          <div>Dr Scan · Cornerstone Viewer</div>
          <div>{study.study_uid.slice(-12)}</div>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-1 text-[10px] text-slate-500">
          <Maximize2 className="h-3 w-3" />
          L-drag W/L · M-drag pan · R-drag zoom · wheel zoom · O overlay
        </div>
      </div>
    </div>
  );
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
      title={label}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition ${
        active ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-white/10" />;
}
