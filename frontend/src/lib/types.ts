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
  overlay_url: string | null;
  anomalies: AnomalyFinding[];
  analyzed_at: string;
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
