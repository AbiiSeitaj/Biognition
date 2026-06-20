import type { Notification, Stats, Study } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

export const api = {
  getStudies: () => request<Study[]>("/api/studies"),
  getStudy: (id: number) => request<Study>(`/api/studies/${id}`),
  getStats: () => request<Stats>("/api/stats"),
  getNotifications: (department?: string) =>
    request<Notification[]>(`/api/notifications${department ? `?department=${department}` : ""}`),
  markRead: (id: number) =>
    request<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  analyze: (id: number) =>
    request<{ study: Study; report: Study["report"] }>(`/api/studies/${id}/analyze`, { method: "POST" }),
  upload: (formData: FormData) =>
    request<{ study: Study; message: string }>("/api/studies/upload", { method: "POST", body: formData }),
  frameUrl: (id: number, wc?: number, ww?: number) => {
    const params = new URLSearchParams();
    if (wc !== undefined) params.set("window_center", String(wc));
    if (ww !== undefined) params.set("window_width", String(ww));
    const q = params.toString();
    return apiUrl(`/api/studies/${id}/frame${q ? `?${q}` : ""}`);
  },
  overlayUrl: (id: number) => apiUrl(`/api/studies/${id}/overlay`),
  heatmapUrl: (id: number) => apiUrl(`/api/studies/${id}/heatmap`),
  thumbnailUrl: (id: number) => apiUrl(`/api/studies/${id}/thumbnail`),
  dicomUrl: (id: number) => apiUrl(`/api/studies/${id}/dicom`),
};
