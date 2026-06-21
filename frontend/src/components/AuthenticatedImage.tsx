"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AuthenticatedImageProps {
  studyId: number;
  alt: string;
  className?: string;
}

/** Loads study thumbnails with Bearer auth (img src alone cannot send tokens). */
export function AuthenticatedImage({ studyId, alt, className }: AuthenticatedImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    api
      .fetchThumbnail(studyId)
      .then((blob) => {
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);
        setSrc(blobUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [studyId]);

  if (!src) {
    return (
      <div
        className={className}
        style={{ background: "var(--surface-muted)" }}
        aria-label={alt}
      />
    );
  }

  return <img src={src} alt={alt} className={className} />;
}
