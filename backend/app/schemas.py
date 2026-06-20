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
    overlay_url: str | None = None
    anomalies: list[AnomalyFinding] = []
    analyzed_at: datetime

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


class StudyListOut(BaseModel):
    studies: list[StudyOut]
    total: int


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
