"""PACS query/retrieve endpoints — patient-centric archive index (DICOM/PACS standard layout)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.auth import require_roles
from app.database import get_db
from app.models import Patient, Study, StudyDistribution, User, UserRole
from app.routers.studies import _study_to_out
from app.schemas import (
    PacsPatientIndexItem,
    PacsPatientIndexOut,
    PacsPatientRecordOut,
    PacsStudyArchiveOut,
)

router = APIRouter(prefix="/pacs", tags=["pacs"])

PACS_ACCESS = (UserRole.RADIOLOGIST, UserRole.DOCTOR, UserRole.ANALYTICS, UserRole.ADMINISTRATOR)


@router.get("/patients", response_model=PacsPatientIndexOut)
def query_patients(
    q: str | None = Query(default=None, description="Patient ID or name (PACS C-FIND style filter)"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*PACS_ACCESS)),
):
    del user
    query = db.query(Patient).options(joinedload(Patient.studies).joinedload(Study.report))
    if q:
        term = f"%{q.strip()}%"
        query = query.filter((Patient.patient_id.ilike(term)) | (Patient.name.ilike(term)))

    patients = query.order_by(Patient.created_at.asc()).all()
    rows = []
    for patient in patients:
        studies = sorted(patient.studies, key=lambda s: s.uploaded_at)
        archived = [s for s in studies if s.archived]
        modalities = sorted({s.modality.value for s in studies})
        last_activity = max(
            (s.archived_at or s.uploaded_at for s in studies),
            default=patient.created_at,
        )
        rows.append(
            PacsPatientIndexItem(
                id=patient.id,
                patient_id=patient.patient_id,
                name=patient.name,
                age=patient.age,
                sex=patient.sex,
                study_count=len(studies),
                archived_count=len(archived),
                modalities=modalities,
                first_record_at=studies[0].uploaded_at if studies else patient.created_at,
                last_activity_at=last_activity,
            )
        )

    rows.sort(key=lambda r: r.last_activity_at, reverse=True)
    return PacsPatientIndexOut(total=len(rows), patients=rows)


@router.get("/patients/{patient_key}/record", response_model=PacsPatientRecordOut)
def retrieve_patient_record(
    patient_key: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*PACS_ACCESS)),
):
    del user
    patient = (
        db.query(Patient)
        .options(
            joinedload(Patient.studies).joinedload(Study.report),
            joinedload(Patient.studies).joinedload(Study.distributions).joinedload(StudyDistribution.building),
            joinedload(Patient.studies).joinedload(Study.submitted_by),
        )
        .filter(
            or_(
                Patient.patient_id == patient_key,
                Patient.id == (int(patient_key) if patient_key.isdigit() else -1),
            )
        )
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in PACS index")

    studies = sorted(patient.studies, key=lambda s: s.uploaded_at, reverse=True)
    archives: list[PacsStudyArchiveOut] = []
    for study in studies:
        study_out = _study_to_out(study)
        archives.append(
            PacsStudyArchiveOut(
                study=study_out,
                report=study_out.report,
                dicom_url=f"/api/studies/{study.id}/dicom",
                frame_url=f"/api/studies/{study.id}/frame",
                thumbnail_url=f"/api/studies/{study.id}/thumbnail",
                overlay_url=study_out.report.overlay_url if study_out.report else None,
                submit_source=study.submit_source,
                archived=study.archived,
                archived_at=study.archived_at,
            )
        )

    return PacsPatientRecordOut(
        patient_id=patient.patient_id,
        name=patient.name,
        age=patient.age,
        sex=patient.sex,
        record_opened_at=patient.created_at,
        study_count=len(studies),
        archived_count=sum(1 for s in studies if s.archived),
        archives=archives,
    )
