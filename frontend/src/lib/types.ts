export interface AnomalyFinding {
  label: string;
  confidence: number;
  region: string;
  severity: string;
}

export interface Patient {
  id: number;
  patient_id: string;
  name: string;
  age: number | null;
  sex: string | null;
}

export interface Report {
  id: number;
  risk_score: number;
  risk_level: "low" | "moderate" | "high" | "critical";
  findings: string;
  impression: string;
  recommendations: string;
  ai_findings?: string | null;
  ai_impression?: string | null;
  ai_recommendations?: string | null;
  ai_risk_level?: string | null;
  overlay_url: string | null;
  anomalies: AnomalyFinding[];
  analyzed_at: string;
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
}

export interface Study {
  id: number;
  study_uid: string;
  modality: string;
  body_part: string;
  description: string;
  archived: boolean;
  archived_at: string | null;
  uploaded_at: string;
  thumbnail_url: string | null;
  dicom_url: string | null;
  patient: Patient;
  report: Report | null;
  pacs_locations?: PacsLocation[];
}

export interface Notification {
  id: number;
  study_id: number;
  department: string;
  title: string;
  message: string;
  risk_score: number;
  read: boolean;
  created_at: string;
}

export interface Stats {
  total_studies: number;
  archived_studies: number;
  high_risk_count: number;
  pending_analysis: number;
  modalities: Record<string, number>;
}

export interface DepartmentFeed {
  department: string;
  studies: Study[];
  unread_notifications: number;
}

export interface AIModel {
  modality: string;
  name: string;
  version: string;
  framework: string;
  datasets: string;
  scope?: string;
}

export interface ActivityEvent {
  id: string;
  type: "upload" | "analysis" | "alert";
  title: string;
  detail: string;
  study_id: number | null;
  timestamp: string;
  severity?: string | null;
}

export interface Analytics {
  risk_distribution: Record<string, number>;
  avg_risk_score: number;
  avg_confidence: number;
  analyzed_studies: number;
  total_notifications: number;
  unread_notifications: number;
  modalities: Record<string, number>;
  recent_activity: ActivityEvent[];
  pipeline: Record<string, number>;
  report_comparisons: ReportComparison[];
}

export interface ReportComparison {
  study_id: number;
  patient_name: string;
  modality: string;
  approved: boolean;
  approved_by: string | null;
  edited: boolean;
  ai_findings: string;
  ai_impression: string;
  ai_recommendations: string;
  ai_risk_level: string;
  radiologist_findings: string;
  radiologist_impression: string;
  radiologist_recommendations: string;
  radiologist_risk_level: string;
  analyzed_at: string;
  approved_at: string | null;
}

export interface CompareResult {
  studies: Study[];
  same_patient: boolean;
  risk_delta: number | null;
}

export type UserRole = "radiologist" | "doctor" | "analytics";

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

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface PacsLocation {
  department: string;
  building_code: string;
  building_name: string;
  campus: string;
  synced_at: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  subtitle: string;
  count: number;
}

export interface PacsNodeInfo {
  id: number;
  department: string;
  name: string;
  is_primary: boolean;
  building_code: string;
  building_name: string;
  campus: string;
  synced_studies: number;
}

export interface WorkflowData {
  title: string;
  steps: WorkflowStep[];
  pacs_network: { nodes: PacsNodeInfo[]; buildings: number };
  updated_at: string;
}

export interface StaffProfile {
  id: number;
  dept_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  department: string | null;
}

export interface CaseMessage {
  id: number;
  study_id: number;
  body: string;
  created_at: string;
  author: StaffProfile;
}

export interface TeamCase {
  study: Study;
  submit_source: string;
  submitter: StaffProfile | null;
  approver: StaffProfile | null;
  approved: boolean;
  approved_at: string | null;
  assignees: StaffProfile[];
  message_count: number;
}

export interface TeamBoard {
  department: string;
  cases: TeamCase[];
  members: StaffProfile[];
}

export interface PacsPatientIndexItem {
  id: number;
  patient_id: string;
  name: string;
  age: number | null;
  sex: string | null;
  study_count: number;
  archived_count: number;
  modalities: string[];
  first_record_at: string;
  last_activity_at: string;
}

export interface PacsPatientIndex {
  total: number;
  patients: PacsPatientIndexItem[];
}

export interface PacsStudyArchive {
  study: Study;
  report: Report | null;
  dicom_url: string;
  frame_url: string;
  thumbnail_url: string;
  overlay_url: string | null;
  submit_source: string | null;
  archived: boolean;
  archived_at: string | null;
}

export interface PacsPatientRecord {
  patient_id: string;
  name: string;
  age: number | null;
  sex: string | null;
  record_opened_at: string;
  study_count: number;
  archived_count: number;
  archives: PacsStudyArchive[];
}
