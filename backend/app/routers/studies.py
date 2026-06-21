import json
import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.auth import require_roles
from app.database import get_db
from app.models import Modality, Patient, Report, RiskLevel, Study, StudyDistribution, User, UserRole
from app.schemas import AnalyzeResponse, PacsLocationOut, ReportOut, ReportUpdateIn, StudyOut, UploadResponse
from app.services.ai_engine import analyze_study
from app.services.dicom_service import create_thumbnail, get_dicom_metadata, save_upload_as_dicom
from app.services.pacs_service import archive_study, create_notifications, distribute_study
from app.services.team_service import auto_assign_study, seed_welcome_messages, submit_source_for_user

router = APIRouter(prefix="/studies", tags=["studies"])
logger = logging.getLogger(__name__)


def _perform_analysis(study: Study, db: Session) -> Study:
    if study.report:
        db.delete(study.report)
        db.commit()

    try:
        result = analyze_study(Path(study.dicom_path), study.study_uid, study.modality, study.body_part)
    except Exception as exc:
        logger.exception("AI analysis failed for study %s", study.id)
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {exc}") from exc

    detected = result.get("detected_body_part")
    if detected and study.modality.value == "XR":
        study.body_part = str(detected).replace("_", " ")
        study.description = study.description or f"XR — {study.body_part}"

    report = Report(
        study_id=study.id,
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        findings=result["findings"],
        impression=result["impression"],
        recommendations=result["recommendations"],
        ai_findings=result["findings"],
        ai_impression=result["impression"],
        ai_recommendations=result["recommendations"],
        ai_risk_level=result["risk_level"],
        overlay_path=result["overlay_path"],
        anomalies_json=result["anomalies_json"],
    )
    db.add(report)
    db.commit()

    archive_study(db, study, report)
    create_notifications(db, study, report)
    auto_assign_study(db, study)
    seed_welcome_messages(db, study)

    return (
        db.query(Study)
        .options(
            joinedload(Study.patient),
            joinedload(Study.report),
            joinedload(Study.distributions).joinedload(StudyDistribution.building),
        )
        .filter(Study.id == study.id)
        .first()
    )


def _study_to_out(study: Study, base_url: str = "") -> StudyOut:
    report_out = None
    if study.report:
        anomalies = json.loads(study.report.anomalies_json or "[]")
        report_out = ReportOut(
            id=study.report.id,
            risk_score=study.report.risk_score,
            risk_level=study.report.risk_level.value,
            findings=study.report.findings,
            impression=study.report.impression,
            recommendations=study.report.recommendations,
            ai_findings=study.report.ai_findings,
            ai_impression=study.report.ai_impression,
            ai_recommendations=study.report.ai_recommendations,
            ai_risk_level=(
                study.report.ai_risk_level.value if study.report.ai_risk_level else None
            ),
            overlay_url=f"/api/studies/{study.id}/overlay" if study.report.overlay_path else None,
            anomalies=anomalies,
            analyzed_at=study.report.analyzed_at,
            approved=study.report.approved,
            approved_at=study.report.approved_at,
            approved_by=study.report.approved_by,
        )

    pacs_locations = []
    for dist in getattr(study, "distributions", []) or []:
        building = dist.building
        pacs_locations.append(
            PacsLocationOut(
                department=dist.department.value,
                building_code=building.code if building else "",
                building_name=building.name if building else "",
                campus=building.campus if building else "",
                synced_at=dist.synced_at,
            )
        )

    return StudyOut(
        id=study.id,
        study_uid=study.study_uid,
        modality=study.modality.value,
        body_part=study.body_part,
        description=study.description,
        archived=study.archived,
        archived_at=study.archived_at,
        uploaded_at=study.uploaded_at,
        thumbnail_url=f"/api/studies/{study.id}/thumbnail",
        dicom_url=f"/api/studies/{study.id}/dicom",
        patient=study.patient,
        report=report_out,
        pacs_locations=pacs_locations,
    )


@router.get("", response_model=list[StudyOut])
def list_studies(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    studies = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .order_by(Study.uploaded_at.desc())
        .all()
    )
    return [_study_to_out(s) for s in studies]


@router.post("/upload", response_model=UploadResponse)
async def upload_study(
    file: UploadFile = File(...),
    patient_id: str = Form(default="P-001"),
    patient_name: str = Form(default="Anonymous Patient"),
    patient_age: int | None = Form(default=None),
    patient_sex: str | None = Form(default=None),
    modality: str = Form(default="XR"),
    description: str = Form(default=""),
    body_part: str = Form(default="AUTO"),
    auto_analyze: bool = Form(default=False),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    try:
        mod = Modality(modality.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported modality: {modality}")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    dicom_path, study_uid, _ = save_upload_as_dicom(
        content, file.filename or "upload.png", patient_id, patient_name, mod.value
    )
    meta = get_dicom_metadata(dicom_path)
    thumb_path = create_thumbnail(dicom_path, study_uid)

    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        patient = Patient(
            patient_id=patient_id,
            name=patient_name,
            age=patient_age,
            sex=patient_sex,
        )
        db.add(patient)
        db.flush()
    else:
        if patient_name:
            patient.name = patient_name
        if patient_age:
            patient.age = patient_age
        if patient_sex:
            patient.sex = patient_sex

    study = Study(
        study_uid=study_uid,
        patient_id=patient.id,
        modality=mod,
        body_part=(body_part or meta.get("body_part", "AUTO")).upper(),
        description=description or meta.get("study_description", ""),
        dicom_path=str(dicom_path),
        thumbnail_path=str(thumb_path),
        submitted_by_id=user.id,
        submit_source=submit_source_for_user(user),
    )
    db.add(study)
    db.commit()
    db.refresh(study)
    study = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .filter(Study.id == study.id)
        .first()
    )

    if auto_analyze:
        study = _perform_analysis(study, db)
        if not study:
            raise HTTPException(status_code=500, detail="Analysis failed")
        return UploadResponse(
            study=_study_to_out(study),
            message="Study uploaded, analyzed, and archived to PACS.",
        )

    return UploadResponse(
        study=_study_to_out(study),
        message="Study uploaded to PACS staging. Run AI analysis to generate report.",
    )


@router.get("/{study_id}", response_model=StudyOut)
def get_study(
    study_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    study = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .filter(Study.id == study_id)
        .first()
    )
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    return _study_to_out(study)


@router.post("/{study_id}/analyze", response_model=AnalyzeResponse)
def run_analysis(
    study_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST)),
):
    study = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .filter(Study.id == study_id)
        .first()
    )
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    study = _perform_analysis(study, db)
    out = _study_to_out(study)
    return AnalyzeResponse(study=out, report=out.report)


@router.patch("/{study_id}/report", response_model=StudyOut)
def update_report(
    study_id: int,
    body: ReportUpdateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST)),
):
    study = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .filter(Study.id == study_id)
        .first()
    )
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    if not study.report:
        raise HTTPException(status_code=404, detail="Report not found")

    report = study.report
    if body.findings is not None:
        report.findings = body.findings
    if body.impression is not None:
        report.impression = body.impression
    if body.recommendations is not None:
        report.recommendations = body.recommendations
    if body.risk_level is not None:
        report.risk_level = RiskLevel(body.risk_level)

    db.commit()
    db.refresh(report)

    study = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .filter(Study.id == study_id)
        .first()
    )
    return _study_to_out(study)


@router.post("/{study_id}/approve", response_model=StudyOut)
def approve_report(
    study_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST)),
):
    study = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .filter(Study.id == study_id)
        .first()
    )
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    if not study.report:
        raise HTTPException(status_code=404, detail="Report not found")

    report = study.report
    report.approved = True
    report.approved_at = datetime.utcnow()
    report.approved_by = user.full_name
    report.approved_by_id = user.id
    db.commit()

    study = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .filter(Study.id == study_id)
        .first()
    )
    return _study_to_out(study)


@router.get("/{study_id}/dicom")
def get_dicom(
    study_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study or not Path(study.dicom_path).exists():
        raise HTTPException(status_code=404, detail="DICOM not found")
    from fastapi.responses import FileResponse

    return FileResponse(study.dicom_path, media_type="application/dicom", filename=f"{study.study_uid}.dcm")


@router.get("/{study_id}/thumbnail")
def get_thumbnail(
    study_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    path = study.thumbnail_path or study.dicom_path
    if not Path(path).exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    from fastapi.responses import FileResponse

    return FileResponse(path, media_type="image/png")


@router.get("/{study_id}/overlay")
def get_overlay(
    study_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    study = db.query(Study).options(joinedload(Study.report)).filter(Study.id == study_id).first()
    if not study or not study.report or not study.report.overlay_path:
        raise HTTPException(status_code=404, detail="Overlay not found")
    if not Path(study.report.overlay_path).exists():
        raise HTTPException(status_code=404, detail="Overlay file missing")
    from fastapi.responses import FileResponse

    return FileResponse(study.report.overlay_path, media_type="image/png")


@router.get("/{study_id}/heatmap")
def get_heatmap(
    study_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    """Heatmap-only PNG for Cornerstone viewer overlay layer."""
    study = db.query(Study).options(joinedload(Study.report)).filter(Study.id == study_id).first()
    if not study or not study.report or not study.report.overlay_path:
        raise HTTPException(status_code=404, detail="Heatmap not found")
    heatmap_path = Path(study.report.overlay_path).with_name(
        f"{Path(study.report.overlay_path).stem}_heatmap.png"
    )
    if not heatmap_path.exists():
        raise HTTPException(status_code=404, detail="Heatmap file missing")
    from fastapi.responses import FileResponse

    return FileResponse(heatmap_path, media_type="image/png")


@router.get("/{study_id}/frame")
def get_frame(
    study_id: int,
    window_center: float | None = None,
    window_width: float | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    """Rendered PNG frame for viewer (window/level adjustable)."""
    from fastapi.responses import Response

    from app.services.dicom_service import dicom_to_png_bytes

    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    png = dicom_to_png_bytes(Path(study.dicom_path), window_center, window_width)
    return Response(content=png, media_type="image/png")
