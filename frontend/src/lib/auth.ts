export type UserRole = "radiologist" | "doctor" | "analytics" | "administrator";

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  dept_id?: string | null;
  role: UserRole;
  department: string | null;
}

const TOKEN_KEY = "drscan-token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function isAdministrator(role: UserRole): boolean {
  return role === "administrator";
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "radiologist":
      return "Radiologist";
    case "doctor":
      return "Department Doctor";
    case "analytics":
      return "Analytics";
    case "administrator":
      return "Administrator";
  }
}

export function roleHomePath(role: UserRole): string {
  if (role === "analytics") return "/analytics";
  return "/";
}

export function canUpload(role: UserRole): boolean {
  return isAdministrator(role) || role === "radiologist" || role === "doctor";
}

export function canAnalyze(role: UserRole): boolean {
  return isAdministrator(role) || role === "radiologist";
}

export function canEditReport(role: UserRole): boolean {
  return isAdministrator(role) || role === "radiologist";
}

export function canApproveReport(role: UserRole): boolean {
  return isAdministrator(role) || role === "radiologist";
}

export function canAccessClinical(role: UserRole): boolean {
  return isAdministrator(role) || role === "radiologist" || role === "doctor";
}

export function canAccessAnalytics(role: UserRole): boolean {
  return isAdministrator(role) || role === "analytics" || role === "radiologist";
}

export function canAccessArchive(role: UserRole): boolean {
  return isAdministrator(role) || role === "radiologist";
}

export function canAccessTeams(role: UserRole): boolean {
  return isAdministrator(role) || role === "radiologist" || role === "doctor";
}

export function canAccessModels(role: UserRole): boolean {
  return isAdministrator(role) || role === "radiologist";
}
