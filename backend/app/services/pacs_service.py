from datetime import datetime

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Department, Notification, Report, RiskLevel, Study


def archive_study(db: Session, study: Study) -> Study:
    study.archived = True
    study.archived_at = datetime.utcnow()
    db.commit()
    db.refresh(study)
    return study


def create_notifications(db: Session, study: Study, report: Report) -> list[Notification]:
    if report.risk_level not in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
        return []

    departments = [
        Department.RADIOLOGY,
        Department.EMERGENCY,
        Department.CARDIOLOGY if "Cardio" in report.findings or report.risk_score > 0.7 else Department.SURGERY,
    ]
    departments = list(dict.fromkeys(departments))

    notifications = []
    urgency = "CRITICAL" if report.risk_level == RiskLevel.CRITICAL else "HIGH"
    for dept in departments:
        note = Notification(
            study_id=study.id,
            department=dept,
            title=f"{urgency} RISK — {study.modality.value} Study",
            message=(
                f"Automated AI flagged {report.risk_level.value} risk "
                f"(score {report.risk_score:.0%}) for patient {study.patient.name}. "
                f"Immediate review recommended."
            ),
            risk_score=report.risk_score,
        )
        db.add(note)
        notifications.append(note)

    db.commit()
    for n in notifications:
        db.refresh(n)
    return notifications
