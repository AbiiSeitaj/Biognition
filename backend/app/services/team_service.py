from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models import Department, Study, StudyAssignment, StudyDistribution, User, UserRole
from app.schemas import StaffProfileOut

DEPT_SITES: dict[str, str] = {
    "radiology": "Main Hospital — Imaging Wing",
    "cardiology": "Cardiac Center — Building B",
    "surgery": "Surgical Wing — Main Campus",
    "emergency": "Emergency Pavilion — Ground Floor",
    "operations": "Operations HQ — Analytics Hub",
}


def split_name(full_name: str) -> tuple[str, str]:
    cleaned = full_name.replace("Dr.", "").replace("Dr", "").strip()
    parts = cleaned.split()
    if len(parts) >= 2:
        return parts[0], " ".join(parts[1:])
    return cleaned, ""


def staff_profile(user: User | None) -> StaffProfileOut | None:
    if not user:
        return None
    first = user.first_name or split_name(user.full_name)[0]
    last = user.last_name or split_name(user.full_name)[1]
    return StaffProfileOut(
        id=user.id,
        dept_id=user.dept_id or "—",
        first_name=first,
        last_name=last,
        full_name=user.full_name,
        role=user.role.value,
        department=user.department,
    )


def submit_source_for_user(user: User) -> str:
    dept = (user.department or "radiology").lower()
    site = DEPT_SITES.get(dept, dept.replace("_", " ").title())
    return f"{dept.replace('_', ' ').title()} — {site}"


def user_can_access_study(db: Session, user: User, study_id: int) -> bool:
    if user.role == UserRole.RADIOLOGIST:
        return True
    if user.role == UserRole.ANALYTICS:
        return False
    assigned = (
        db.query(StudyAssignment)
        .filter(StudyAssignment.study_id == study_id, StudyAssignment.user_id == user.id)
        .first()
    )
    if assigned:
        return True
    if user.department:
        dept = user.department.lower()
        dist = (
            db.query(StudyDistribution)
            .filter(
                StudyDistribution.study_id == study_id,
                StudyDistribution.department == Department(dept),
            )
            .first()
        )
        return dist is not None
    return False


def auto_assign_study(db: Session, study: Study) -> None:
    existing = {
        (row.user_id, row.department)
        for row in db.query(StudyAssignment).filter(StudyAssignment.study_id == study.id).all()
    }

    departments = {
        dist.department.value
        for dist in db.query(StudyDistribution).filter(StudyDistribution.study_id == study.id).all()
    }
    if not departments:
        departments = {"radiology"}

    for dept in departments:
        doctors = (
            db.query(User)
            .filter(
                User.active.is_(True),
                User.role == UserRole.DOCTOR,
                User.department == dept,
            )
            .all()
        )
        for doctor in doctors:
            key = (doctor.id, dept)
            if key in existing:
                continue
            db.add(
                StudyAssignment(
                    study_id=study.id,
                    user_id=doctor.id,
                    department=dept,
                )
            )
            existing.add(key)

    radiologists = (
        db.query(User)
        .filter(User.active.is_(True), User.role == UserRole.RADIOLOGIST)
        .limit(2)
        .all()
    )
    for rad in radiologists:
        key = (rad.id, "radiology")
        if key in existing:
            continue
        db.add(
            StudyAssignment(
                study_id=study.id,
                user_id=rad.id,
                department="radiology",
            )
        )
        existing.add(key)

    db.commit()


def seed_welcome_messages(db: Session, study: Study) -> None:
    from app.models import CaseMessage

    if db.query(CaseMessage).filter(CaseMessage.study_id == study.id).first():
        return

    assignees = (
        db.query(StudyAssignment)
        .options(joinedload(StudyAssignment.user))
        .filter(StudyAssignment.study_id == study.id)
        .limit(3)
        .all()
    )
    if not assignees:
        return

    templates = [
        "Case synced to our department PACS — reviewing findings now.",
        "AI report loaded. I'll coordinate with other teams on next steps.",
        "Please flag if you need urgent cross-department consult on this case.",
    ]
    for idx, assignment in enumerate(assignees):
        db.add(
            CaseMessage(
                study_id=study.id,
                user_id=assignment.user.id,
                body=templates[idx % len(templates)],
            )
        )
    db.commit()
