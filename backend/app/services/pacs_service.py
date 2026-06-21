from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.models import Building, Department, Notification, PacsNode, Report, RiskLevel, Study, StudyDistribution

# Default cross-building PACS topology — each department has a node in its building.
PACS_TOPOLOGY: list[tuple[Department, str, str, bool]] = [
    (Department.RADIOLOGY, "MAIN", "Main Hospital — Imaging Wing", True),
    (Department.CARDIOLOGY, "CARD", "Cardiac Center — Building B", False),
    (Department.SURGERY, "SURG", "Surgical Wing — Main Campus", False),
    (Department.EMERGENCY, "ER", "Emergency Pavilion — Ground Floor", False),
    (Department.OPERATIONS, "HQ", "Operations HQ — Analytics Hub", False),
]


def archive_study(db: Session, study: Study, report: Report | None = None) -> Study:
    study.archived = True
    study.archived_at = datetime.utcnow()
    db.commit()
    db.refresh(study)
    distribute_study(db, study, report)
    return study


def distribute_study(db: Session, study: Study, report: Report | None = None) -> list[StudyDistribution]:
    """Replicate study metadata to PACS nodes across departments and buildings."""
    if report is None:
        report = study.report

    existing = {
        (d.department, d.building_id)
        for d in db.query(StudyDistribution).filter(StudyDistribution.study_id == study.id).all()
    }

    nodes = (
        db.query(PacsNode)
        .options(joinedload(PacsNode.building))
        .order_by(PacsNode.is_primary.desc())
        .all()
    )
    if not nodes:
        return []

    target_departments = {n.department for n in nodes}
    if report and report.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
        target_departments.update({Department.RADIOLOGY, Department.EMERGENCY, Department.CARDIOLOGY})

    created: list[StudyDistribution] = []
    now = datetime.utcnow()
    for node in nodes:
        if node.department not in target_departments:
            continue
        key = (node.department, node.building_id)
        if key in existing:
            continue
        row = StudyDistribution(
            study_id=study.id,
            department=node.department,
            building_id=node.building_id,
            synced_at=now,
        )
        db.add(row)
        created.append(row)
        existing.add(key)

    if created:
        db.commit()
        for row in created:
            db.refresh(row)
    return created


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
                f"Study synced to {dept.value} PACS — immediate review recommended."
            ),
            risk_score=report.risk_score,
        )
        db.add(note)
        notifications.append(note)

    db.commit()
    for n in notifications:
        db.refresh(n)
    return notifications


def get_workflow_counts(db: Session) -> dict[str, int]:
    studies = db.query(Study).all()
    reports = db.query(Report).count()
    archived = sum(1 for s in studies if s.archived)
    distributed = db.query(StudyDistribution.study_id).distinct().count()
    return {
        "uploaded": len(studies),
        "analyzed": reports,
        "archived": archived,
        "distributed": distributed,
    }
