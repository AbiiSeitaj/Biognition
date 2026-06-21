import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Modality(str, enum.Enum):
    XR = "XR"
    CT = "CT"
    MR = "MR"
    US = "US"


class Department(str, enum.Enum):
    RADIOLOGY = "radiology"
    CARDIOLOGY = "cardiology"
    SURGERY = "surgery"
    EMERGENCY = "emergency"
    OPERATIONS = "operations"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class UserRole(str, enum.Enum):
    RADIOLOGIST = "radiologist"
    DOCTOR = "doctor"
    ANALYTICS = "analytics"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    full_name: Mapped[str] = mapped_column(String(128))
    first_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    dept_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole))
    department: Mapped[str | None] = mapped_column(String(64), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    submitted_studies: Mapped[list["Study"]] = relationship(back_populates="submitted_by")
    study_assignments: Mapped[list["StudyAssignment"]] = relationship(back_populates="user")
    case_messages: Mapped[list["CaseMessage"]] = relationship(back_populates="user")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sex: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    studies: Mapped[list["Study"]] = relationship(back_populates="patient")


class Study(Base):
    __tablename__ = "studies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    study_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    modality: Mapped[Modality] = mapped_column(Enum(Modality))
    body_part: Mapped[str] = mapped_column(String(64), default="Chest")
    description: Mapped[str] = mapped_column(String(256), default="")
    dicom_path: Mapped[str] = mapped_column(String(512))
    thumbnail_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    submitted_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    submit_source: Mapped[str | None] = mapped_column(String(256), nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="studies")
    report: Mapped["Report | None"] = relationship(back_populates="study", uselist=False)
    distributions: Mapped[list["StudyDistribution"]] = relationship(back_populates="study")
    submitted_by: Mapped["User | None"] = relationship(back_populates="submitted_studies")
    assignments: Mapped[list["StudyAssignment"]] = relationship(back_populates="study")
    messages: Mapped[list["CaseMessage"]] = relationship(back_populates="study")


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    campus: Mapped[str] = mapped_column(String(128), default="")

    pacs_nodes: Mapped[list["PacsNode"]] = relationship(back_populates="building")


class PacsNode(Base):
    __tablename__ = "pacs_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"))
    department: Mapped[Department] = mapped_column(Enum(Department))
    name: Mapped[str] = mapped_column(String(128))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    building: Mapped["Building"] = relationship(back_populates="pacs_nodes")


class StudyDistribution(Base):
    __tablename__ = "study_distributions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    study_id: Mapped[int] = mapped_column(ForeignKey("studies.id"), index=True)
    department: Mapped[Department] = mapped_column(Enum(Department))
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"))
    synced_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    study: Mapped["Study"] = relationship(back_populates="distributions")
    building: Mapped["Building"] = relationship()


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    study_id: Mapped[int] = mapped_column(ForeignKey("studies.id"), unique=True)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.LOW)
    findings: Mapped[str] = mapped_column(Text, default="")
    impression: Mapped[str] = mapped_column(Text, default="")
    recommendations: Mapped[str] = mapped_column(Text, default="")
    ai_findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_impression: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_recommendations: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_risk_level: Mapped[RiskLevel | None] = mapped_column(Enum(RiskLevel), nullable=True)
    overlay_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    anomalies_json: Mapped[str] = mapped_column(Text, default="[]")
    analyzed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    study: Mapped["Study"] = relationship(back_populates="report")
    approver: Mapped["User | None"] = relationship(foreign_keys=[approved_by_id])


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    study_id: Mapped[int] = mapped_column(ForeignKey("studies.id"))
    department: Mapped[Department] = mapped_column(Enum(Department))
    title: Mapped[str] = mapped_column(String(256))
    message: Mapped[str] = mapped_column(Text)
    risk_score: Mapped[float] = mapped_column(Float)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudyAssignment(Base):
    __tablename__ = "study_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    study_id: Mapped[int] = mapped_column(ForeignKey("studies.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    department: Mapped[str] = mapped_column(String(64))
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    study: Mapped["Study"] = relationship(back_populates="assignments")
    user: Mapped["User"] = relationship(back_populates="study_assignments")


class CaseMessage(Base):
    __tablename__ = "case_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    study_id: Mapped[int] = mapped_column(ForeignKey("studies.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    study: Mapped["Study"] = relationship(back_populates="messages")
    user: Mapped["User"] = relationship(back_populates="case_messages")
