import type { Notification, Stats, Study } from "./types";

/** Resolve API base URL for local Docker and Tailscale deployments. */
export function resolveApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (process.env.NEXT_PUBLIC_BACKEND_URL) return process.env.NEXT_PUBLIC_BACKEND_URL;

  if (typeof window !== "undefined") {
    const { hostname, protocol, port } = window.location;

    // Tailscale Serve can proxy /api on the same HTTPS host.
    if (hostname.endsWith(".ts.net")) {
      if (protocol === "https:" && (!port || port === "443")) {
        return "";
      }
      return `${protocol}//${hostname}:8000`;
    }

    // Tailscale direct IP (100.x.x.x) or LAN hostname.
    if (/^100\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return `${protocol}//${hostname}:8000`;
    }

    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:8000`;
    }
  }

  return "http://127.0.0.1:8000";
}

const API_BASE = resolveApiBase();

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
