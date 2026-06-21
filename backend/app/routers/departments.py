from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.auth import require_roles
from app.database import get_db
from app.models import Department, Notification, Study, StudyDistribution, User, UserRole
from app.routers.studies import _study_to_out
from app.schemas import DepartmentFeedOut, NotificationOut, StatsOut

router = APIRouter(tags=["departments"])


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(
    department: str | None = None,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    query = db.query(Notification).order_by(Notification.created_at.desc())
    if department:
        try:
            dept = Department(department.lower())
            query = query.filter(Notification.department == dept)
        except ValueError:
            pass
    if unread_only:
        query = query.filter(Notification.read.is_(False))
    return query.limit(50).all()


@router.patch("/notifications/{notification_id}/read")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    note = db.query(Notification).filter(Notification.id == notification_id).first()
    if not note:
        return {"ok": False}
    note.read = True
    db.commit()
    return {"ok": True}


@router.get("/departments/{department}", response_model=DepartmentFeedOut)
def department_feed(
    department: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    try:
        dept = Department(department.lower())
    except ValueError:
        dept = Department.RADIOLOGY

    study_ids = [
        row[0]
        for row in db.query(StudyDistribution.study_id)
        .filter(StudyDistribution.department == dept)
        .distinct()
        .all()
    ]

    query = (
        db.query(Study)
        .options(
            joinedload(Study.patient),
            joinedload(Study.report),
            joinedload(Study.distributions).joinedload(StudyDistribution.building),
        )
        .filter(Study.archived.is_(True))
    )
    if study_ids:
        query = query.filter(Study.id.in_(study_ids))
    studies = query.order_by(Study.archived_at.desc()).limit(20).all()
    unread = (
        db.query(Notification)
        .filter(Notification.department == dept, Notification.read.is_(False))
        .count()
    )
    return DepartmentFeedOut(
        department=dept.value,
        studies=[_study_to_out(s) for s in studies],
        unread_notifications=unread,
    )


@router.get("/stats", response_model=StatsOut)
def dashboard_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ANALYTICS, UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    from app.models import Report, RiskLevel

    studies = db.query(Study).all()
    archived = sum(1 for s in studies if s.archived)
    pending = sum(1 for s in studies if not s.report)
    high_risk = db.query(Report).filter(Report.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])).count()
    modalities: dict[str, int] = {}
    for s in studies:
        key = s.modality.value
        modalities[key] = modalities.get(key, 0) + 1

    return StatsOut(
        total_studies=len(studies),
        archived_studies=archived,
        high_risk_count=high_risk,
        pending_analysis=pending,
        modalities=modalities,
    )
