import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Modality, Patient, Report, Study
from app.schemas import AnalyzeResponse, ReportOut, StudyOut, UploadResponse
from app.services.ai_engine import analyze_study
from app.services.dicom_service import create_thumbnail, get_dicom_metadata, save_upload_as_dicom
from app.services.pacs_service import archive_study, create_notifications

router = APIRouter(prefix="/studies", tags=["studies"])


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
            overlay_url=f"/api/studies/{study.id}/overlay" if study.report.overlay_path else None,
            anomalies=anomalies,
            analyzed_at=study.report.analyzed_at,
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
    )


@router.get("", response_model=list[StudyOut])
def list_studies(db: Session = Depends(get_db)):
    studies = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .order_by(Study.uploaded_at.desc())
        .all()
    )
    return [_study_to_out(s) for s in studies]


@router.get("/{study_id}", response_model=StudyOut)
def get_study(study_id: int, db: Session = Depends(get_db)):
    study = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .filter(Study.id == study_id)
        .first()
    )
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    return _study_to_out(study)


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
    db: Session = Depends(get_db),
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

    return UploadResponse(
        study=_study_to_out(study),
        message="Study uploaded to PACS staging. Run AI analysis to generate report.",
    )


@router.post("/{study_id}/analyze", response_model=AnalyzeResponse)
def run_analysis(study_id: int, db: Session = Depends(get_db)):
    study = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .filter(Study.id == study_id)
        .first()
    )
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    if study.report:
        db.delete(study.report)
        db.commit()

    result = analyze_study(Path(study.dicom_path), study.study_uid, study.modality, study.body_part)

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
        overlay_path=result["overlay_path"],
        anomalies_json=result["anomalies_json"],
    )
    db.add(report)
    db.commit()

    archive_study(db, study)
    create_notifications(db, study, report)

    study = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .filter(Study.id == study_id)
        .first()
    )
    out = _study_to_out(study)
    return AnalyzeResponse(study=out, report=out.report)


@router.get("/{study_id}/dicom")
def get_dicom(study_id: int, db: Session = Depends(get_db)):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study or not Path(study.dicom_path).exists():
        raise HTTPException(status_code=404, detail="DICOM not found")
    from fastapi.responses import FileResponse

    return FileResponse(study.dicom_path, media_type="application/dicom", filename=f"{study.study_uid}.dcm")


@router.get("/{study_id}/thumbnail")
def get_thumbnail(study_id: int, db: Session = Depends(get_db)):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    path = study.thumbnail_path or study.dicom_path
    if not Path(path).exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    from fastapi.responses import FileResponse

    return FileResponse(path, media_type="image/png")


@router.get("/{study_id}/overlay")
def get_overlay(study_id: int, db: Session = Depends(get_db)):
    study = db.query(Study).options(joinedload(Study.report)).filter(Study.id == study_id).first()
    if not study or not study.report or not study.report.overlay_path:
        raise HTTPException(status_code=404, detail="Overlay not found")
    if not Path(study.report.overlay_path).exists():
        raise HTTPException(status_code=404, detail="Overlay file missing")
    from fastapi.responses import FileResponse

    return FileResponse(study.report.overlay_path, media_type="image/png")


@router.get("/{study_id}/heatmap")
def get_heatmap(study_id: int, db: Session = Depends(get_db)):
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
def get_frame(study_id: int, window_center: float | None = None, window_width: float | None = None, db: Session = Depends(get_db)):
    """Rendered PNG frame for viewer (window/level adjustable)."""
    from fastapi.responses import Response

    from app.services.dicom_service import dicom_to_png_bytes

    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    png = dicom_to_png_bytes(Path(study.dicom_path), window_center, window_width)
    return Response(content=png, media_type="image/png")
