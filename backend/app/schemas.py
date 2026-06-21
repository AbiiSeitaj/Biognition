from datetime import datetime
from pydantic import BaseModel, Field


class AnomalyFinding(BaseModel):
    label: str
    confidence: float
    region: str
    severity: str


class PatientOut(BaseModel):
    id: int
    patient_id: str
    name: str
    age: int | None
    sex: str | None

    class Config:
        from_attributes = True


class ReportOut(BaseModel):
    id: int
    risk_score: float
    risk_level: str
    findings: str
    impression: str
    recommendations: str
    ai_findings: str | None = None
    ai_impression: str | None = None
    ai_recommendations: str | None = None
    ai_risk_level: str | None = None
    overlay_url: str | None = None
    anomalies: list[AnomalyFinding] = []
    analyzed_at: datetime
    approved: bool = False
    approved_at: datetime | None = None
    approved_by: str | None = None

    class Config:
        from_attributes = True


class PacsLocationOut(BaseModel):
    department: str
    building_code: str
    building_name: str
    campus: str
    synced_at: datetime


class StudyOut(BaseModel):
    id: int
    study_uid: str
    modality: str
    body_part: str
    description: str
    archived: bool
    archived_at: datetime | None
    uploaded_at: datetime
    thumbnail_url: str | None = None
    dicom_url: str | None = None
    patient: PatientOut
    report: ReportOut | None = None
    pacs_locations: list[PacsLocationOut] = []

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    study: StudyOut
    message: str


class AnalyzeResponse(BaseModel):
    study: StudyOut
    report: ReportOut


class NotificationOut(BaseModel):
    id: int
    study_id: int
    department: str
    title: str
    message: str
    risk_score: float
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DepartmentFeedOut(BaseModel):
    department: str
    studies: list[StudyOut]
    unread_notifications: int


class StatsOut(BaseModel):
    total_studies: int
    archived_studies: int
    high_risk_count: int
    pending_analysis: int
    modalities: dict[str, int]


class ActivityEvent(BaseModel):
    id: str
    type: str
    title: str
    detail: str
    study_id: int | None = None
    timestamp: datetime
    severity: str | None = None


class ReportComparisonOut(BaseModel):
    study_id: int
    patient_name: str
    modality: str
    approved: bool
    approved_by: str | None = None
    edited: bool
    ai_findings: str
    ai_impression: str
    ai_recommendations: str
    ai_risk_level: str
    radiologist_findings: str
    radiologist_impression: str
    radiologist_recommendations: str
    radiologist_risk_level: str
    analyzed_at: datetime
    approved_at: datetime | None = None


class AnalyticsOut(BaseModel):
    risk_distribution: dict[str, int]
    avg_risk_score: float
    avg_confidence: float
    analyzed_studies: int
    total_notifications: int
    unread_notifications: int
    modalities: dict[str, int]
    recent_activity: list[ActivityEvent]
    pipeline: dict[str, int]
    report_comparisons: list[ReportComparisonOut] = []


class CompareOut(BaseModel):
    studies: list[StudyOut]
    same_patient: bool
    risk_delta: float | None = None


class ReportUpdateIn(BaseModel):
    findings: str | None = None
    impression: str | None = None
    recommendations: str | None = None
    risk_level: str | None = Field(default=None, pattern="^(low|moderate|high|critical)$")


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    first_name: str | None = None
    last_name: str | None = None
    dept_id: str | None = None
    role: str
    department: str | None = None


class StaffProfileOut(BaseModel):
    id: int
    dept_id: str
    first_name: str
    last_name: str
    full_name: str
    role: str
    department: str | None = None


class CaseMessageOut(BaseModel):
    id: int
    study_id: int
    body: str
    created_at: datetime
    author: StaffProfileOut


class TeamCaseOut(BaseModel):
    study: StudyOut
    submit_source: str
    submitter: StaffProfileOut | None = None
    approver: StaffProfileOut | None = None
    approved: bool = False
    approved_at: datetime | None = None
    assignees: list[StaffProfileOut] = []
    message_count: int = 0


class TeamBoardOut(BaseModel):
    department: str
    cases: list[TeamCaseOut]
    members: list[StaffProfileOut]


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class WorkflowStepOut(BaseModel):
    id: str
    label: str
    subtitle: str
    count: int


class PacsNodeOut(BaseModel):
    id: int
    department: str
    name: str
    is_primary: bool
    building_code: str
    building_name: str
    campus: str
    synced_studies: int


class PacsNetworkOut(BaseModel):
    nodes: list[PacsNodeOut]
    buildings: int


class WorkflowOut(BaseModel):
    title: str
    steps: list[WorkflowStepOut]
    pacs_network: PacsNetworkOut
    updated_at: datetime


class PacsPatientIndexItem(BaseModel):
    id: int
    patient_id: str
    name: str
    age: int | None
    sex: str | None
    study_count: int
    archived_count: int
    modalities: list[str]
    first_record_at: datetime
    last_activity_at: datetime


class PacsPatientIndexOut(BaseModel):
    total: int
    patients: list[PacsPatientIndexItem]


class PacsStudyArchiveOut(BaseModel):
    study: StudyOut
    report: ReportOut | None = None
    dicom_url: str
    frame_url: str
    thumbnail_url: str
    overlay_url: str | None = None
    submit_source: str | None = None
    archived: bool
    archived_at: datetime | None = None


class PacsPatientRecordOut(BaseModel):
    patient_id: str
    name: str
    age: int | None
    sex: str | None
    record_opened_at: datetime
    study_count: int
    archived_count: int
    archives: list[PacsStudyArchiveOut]
