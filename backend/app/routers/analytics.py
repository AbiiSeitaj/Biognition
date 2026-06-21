import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.auth import require_roles
from app.database import get_db
from app.models import Notification, Report, RiskLevel, Study, User, UserRole
from app.routers.studies import _study_to_out
from app.schemas import ActivityEvent, AnalyticsOut, CompareOut, ReportComparisonOut

router = APIRouter(tags=["analytics"])


def _report_was_edited(report: Report) -> bool:
    if not report.ai_findings:
        return False
    ai_level = report.ai_risk_level.value if report.ai_risk_level else report.risk_level.value
    return (
        report.findings != report.ai_findings
        or report.impression != report.ai_impression
        or report.recommendations != report.ai_recommendations
        or report.risk_level.value != ai_level
    )


def _build_report_comparisons(db: Session) -> list[ReportComparisonOut]:
    reports = (
        db.query(Report)
        .options(joinedload(Report.study).joinedload(Study.patient))
        .filter(Report.ai_findings.isnot(None))
        .order_by(Report.analyzed_at.desc())
        .all()
    )
    comparisons: list[ReportComparisonOut] = []
    for report in reports:
        study = report.study
        if not study:
            continue
        patient = study.patient
        ai_level = report.ai_risk_level.value if report.ai_risk_level else report.risk_level.value
        comparisons.append(
            ReportComparisonOut(
                study_id=study.id,
                patient_name=patient.name if patient else "Patient",
                modality=study.modality.value,
                approved=report.approved,
                approved_by=report.approved_by,
                edited=_report_was_edited(report),
                ai_findings=report.ai_findings or "",
                ai_impression=report.ai_impression or "",
                ai_recommendations=report.ai_recommendations or "",
                ai_risk_level=ai_level,
                radiologist_findings=report.findings,
                radiologist_impression=report.impression,
                radiologist_recommendations=report.recommendations,
                radiologist_risk_level=report.risk_level.value,
                analyzed_at=report.analyzed_at,
                approved_at=report.approved_at,
            )
        )
    return comparisons


@router.get("/analytics", response_model=AnalyticsOut)
def get_analytics(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ANALYTICS, UserRole.RADIOLOGIST)),
):
    studies = db.query(Study).options(joinedload(Study.report), joinedload(Study.patient)).all()
    reports = db.query(Report).all()
    notifications = db.query(Notification).order_by(Notification.created_at.desc()).all()
    report_comparisons = _build_report_comparisons(db)

    risk_distribution = {"low": 0, "moderate": 0, "high": 0, "critical": 0}
    confidences: list[float] = []
    for r in reports:
        risk_distribution[r.risk_level.value] = risk_distribution.get(r.risk_level.value, 0) + 1
        for a in json.loads(r.anomalies_json or "[]"):
            confidences.append(float(a.get("confidence", 0)))

    modalities: dict[str, int] = {}
    for s in studies:
        key = s.modality.value
        modalities[key] = modalities.get(key, 0) + 1

    avg_risk = sum(r.risk_score for r in reports) / len(reports) if reports else 0.0
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    activity: list[ActivityEvent] = []
    for s in sorted(studies, key=lambda x: x.uploaded_at, reverse=True)[:8]:
        pname = s.patient.name if s.patient else "Patient"
        activity.append(
            ActivityEvent(
                id=f"upload-{s.id}",
                type="upload",
                title=f"Scan uploaded — {pname}",
                detail=f"{s.modality.value} · {s.body_part}",
                study_id=s.id,
                timestamp=s.uploaded_at,
            )
        )
    for r in sorted(reports, key=lambda x: x.analyzed_at, reverse=True)[:8]:
        study = db.query(Study).options(joinedload(Study.patient)).filter(Study.id == r.study_id).first()
        pname = study.patient.name if study and study.patient else "Patient"
        activity.append(
            ActivityEvent(
                id=f"analyze-{r.id}",
                type="analysis",
                title=f"AI report ready — {pname}",
                detail=f"Risk {int(r.risk_score * 100)}% ({r.risk_level.value})",
                study_id=r.study_id,
                timestamp=r.analyzed_at,
                severity=r.risk_level.value,
            )
        )
    for n in notifications[:6]:
        activity.append(
            ActivityEvent(
                id=f"alert-{n.id}",
                type="alert",
                title=n.title,
                detail=n.message[:120],
                study_id=n.study_id,
                timestamp=n.created_at,
                severity="high" if n.risk_score >= 0.65 else "moderate",
            )
        )

    activity.sort(key=lambda e: e.timestamp, reverse=True)

    return AnalyticsOut(
        risk_distribution=risk_distribution,
        avg_risk_score=round(avg_risk, 3),
        avg_confidence=round(avg_conf, 3),
        analyzed_studies=len(reports),
        total_notifications=len(notifications),
        unread_notifications=sum(1 for n in notifications if not n.read),
        modalities=modalities,
        recent_activity=activity[:12],
        pipeline={
            "uploaded": len(studies),
            "analyzed": len(reports),
            "archived": sum(1 for s in studies if s.archived),
            "high_risk": sum(
                1 for r in reports if r.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)
            ),
        },
        report_comparisons=report_comparisons,
    )


@router.get("/compare", response_model=CompareOut)
def compare_studies(
    ids: str = Query(..., description="Comma-separated study IDs, e.g. 1,2"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    try:
        id_list = [int(x.strip()) for x in ids.split(",") if x.strip()]
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid study IDs") from exc

    if len(id_list) != 2:
        raise HTTPException(status_code=400, detail="Provide exactly two study IDs")

    studies = (
        db.query(Study)
        .options(joinedload(Study.patient), joinedload(Study.report))
        .filter(Study.id.in_(id_list))
        .all()
    )
    if len(studies) != 2:
        raise HTTPException(status_code=404, detail="One or both studies not found")

    studies.sort(key=lambda s: id_list.index(s.id))
    same_patient = studies[0].patient.patient_id == studies[1].patient.patient_id
    risk_delta = None
    if studies[0].report and studies[1].report:
        risk_delta = round(studies[1].report.risk_score - studies[0].report.risk_score, 3)

    return CompareOut(
        studies=[_study_to_out(s) for s in studies],
        same_patient=same_patient,
        risk_delta=risk_delta,
    )
