import type {
  AIModel,
  Analytics,
  AuthUser,
  CompareResult,
  DepartmentFeed,
  LoginResponse,
  Notification,
  Stats,
  Study,
  TeamBoard,
  CaseMessage,
  PacsPatientIndex,
  PacsPatientRecord,
  WorkflowData,
} from "./types";
import { getStoredToken } from "./auth";

const ANALYSIS_TIMEOUT_MS = 5 * 60 * 1000;

/** Resolve API base URL for local, Docker, Tailscale, and LAN deployments. */
export function resolveApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl !== undefined && envUrl !== "") return envUrl.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const { hostname, port } = window.location;
    // Only use a direct backend URL when the UI itself is served from port 8000.
    const isDirectApiUi = (hostname === "localhost" || hostname === "127.0.0.1") && port === "8000";
    if (!isDirectApiUi) {
      // Same-origin /api — proxied to the backend by Next.js (works for teammates remotely).
      return "";
    }
  }

  return "http://127.0.0.1:8000";
}

export function getApiBase(): string {
  return resolveApiBase();
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getApiBase()}${path}`;
  const token = typeof window !== "undefined" ? getStoredToken() : null;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  } catch (err) {
    const base = getApiBase() || "this site (same-origin /api)";
    const hint =
      getApiBase() === ""
        ? "Ensure the API container is running and Next.js is proxying /api to the backend."
        : `Ensure the API is reachable at ${base} and CORS allows this origin.`;
    throw new Error(
      `Cannot reach the API (${url}). ${hint} ${err instanceof Error ? err.message : ""}`.trim()
    );
  }
  if (!res.ok) {
    const text = await res.text();
    let message = text || `Request failed: ${res.status}`;
    if (text) {
      try {
        const parsed = JSON.parse(text) as { detail?: unknown };
        if (typeof parsed.detail === "string") {
          message = parsed.detail;
        } else if (Array.isArray(parsed.detail)) {
          message = parsed.detail
            .map((item: { msg?: string }) => item.msg ?? JSON.stringify(item))
            .join("; ");
        }
      } catch {
        // Plain-text error body (e.g. unhandled 500) — use raw text.
      }
    }
    throw new Error(message);
  }
  return res.json();
}

export function apiUrl(path: string) {
  return `${getApiBase()}${path}`;
}

/** Fetch binary assets (DICOM, PNG) with auth — plain fetch/img src cannot send Bearer tokens. */
export async function fetchBlob(path: string): Promise<Blob> {
  const url = `${getApiBase()}${path}`;
  const token = typeof window !== "undefined" ? getStoredToken() : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Failed to load resource (${res.status})`);
  }
  return res.blob();
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<AuthUser>("/api/auth/me"),
  getWorkflow: () => request<WorkflowData>("/api/workflow"),
  getStudies: () => request<Study[]>("/api/studies"),
  getStudy: (id: number) => request<Study>(`/api/studies/${id}`),
  getStats: () => request<Stats>("/api/stats"),
  getNotifications: (department?: string, unreadOnly?: boolean) => {
    const params = new URLSearchParams();
    if (department) params.set("department", department);
    if (unreadOnly) params.set("unread_only", "true");
    const q = params.toString();
    return request<Notification[]>(`/api/notifications${q ? `?${q}` : ""}`);
  },
  getDepartmentFeed: (department: string) =>
    request<DepartmentFeed>(`/api/departments/${department}`),
  getTeamBoard: (department?: string) => {
    const q = department ? `?department=${encodeURIComponent(department)}` : "";
    return request<TeamBoard>(`/api/teams/board${q}`);
  },
  getCaseMessages: (studyId: number) =>
    request<CaseMessage[]>(`/api/teams/studies/${studyId}/messages`),
  postCaseMessage: (studyId: number, body: string) =>
    request<CaseMessage>(`/api/teams/studies/${studyId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  queryPacsPatients: (q?: string) => {
    const params = q ? `?q=${encodeURIComponent(q)}` : "";
    return request<PacsPatientIndex>(`/api/pacs/patients${params}`);
  },
  getPacsPatientRecord: (patientKey: string) =>
    request<PacsPatientRecord>(`/api/pacs/patients/${encodeURIComponent(patientKey)}/record`),
  getModels: () => request<{ models: AIModel[] }>("/api/models"),
  getAnalytics: () => request<Analytics>("/api/analytics"),
  compareStudies: (a: number, b: number) =>
    request<CompareResult>(`/api/compare?ids=${a},${b}`),
  updateReport: (
    studyId: number,
    data: { findings?: string; impression?: string; recommendations?: string; risk_level?: string }
  ) =>
    request<Study>(`/api/studies/${studyId}/report`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  approveReport: (studyId: number) =>
    request<Study>(`/api/studies/${studyId}/approve`, { method: "POST" }),
  markRead: (id: number) =>
    request<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  analyze: (id: number) =>
    request<{ study: Study; report: Study["report"] }>(`/api/studies/${id}/analyze`, {
      method: "POST",
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
    }),
  upload: (formData: FormData) =>
    request<{ study: Study; message: string }>("/api/studies/upload", {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
    }),
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
  fetchBlob,
  fetchDicom: (id: number) => fetchBlob(`/api/studies/${id}/dicom`),
  fetchHeatmap: (id: number) => fetchBlob(`/api/studies/${id}/heatmap`),
  fetchThumbnail: (id: number) => fetchBlob(`/api/studies/${id}/thumbnail`),
  fetchFrame: (id: number, wc?: number, ww?: number) => {
    const params = new URLSearchParams();
    if (wc !== undefined) params.set("window_center", String(wc));
    if (ww !== undefined) params.set("window_width", String(ww));
    const q = params.toString();
    return fetchBlob(`/api/studies/${id}/frame${q ? `?${q}` : ""}`);
  },
};
