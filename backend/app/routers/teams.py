from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.auth import require_roles
from app.database import get_db
from app.models import CaseMessage, Department, Report, Study, StudyAssignment, StudyDistribution, User, UserRole
from app.routers.studies import _study_to_out
from app.schemas import CaseMessageOut, StaffProfileOut, TeamBoardOut, TeamCaseOut
from app.services.team_service import auto_assign_study, seed_welcome_messages, staff_profile, user_can_access_study

router = APIRouter(prefix="/teams", tags=["teams"])


class PostMessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class AssignIn(BaseModel):
    user_ids: list[int] = Field(default_factory=list)


@router.get("/board", response_model=TeamBoardOut)
def team_board(
    department: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    dept = (department or user.department or "radiology").lower()
    try:
        dept_enum = Department(dept)
    except ValueError:
        dept_enum = Department.RADIOLOGY
        dept = dept_enum.value

    study_ids = [
        row[0]
        for row in db.query(StudyDistribution.study_id)
        .filter(StudyDistribution.department == dept_enum)
        .distinct()
        .all()
    ]

    query = (
        db.query(Study)
        .options(
            joinedload(Study.patient),
            joinedload(Study.report).joinedload(Report.approver),
            joinedload(Study.submitted_by),
            joinedload(Study.distributions).joinedload(StudyDistribution.building),
            joinedload(Study.assignments).joinedload(StudyAssignment.user),
        )
        .filter(Study.archived.is_(True))
    )
    if study_ids:
        query = query.filter(Study.id.in_(study_ids))
    studies = query.order_by(Study.archived_at.desc()).limit(30).all()

    members_query = db.query(User).filter(User.active.is_(True))
    if user.role == UserRole.DOCTOR:
        members_query = members_query.filter(
            (User.department == dept) | (User.role == UserRole.RADIOLOGIST)
        )
    members = members_query.order_by(User.role.asc(), User.last_name.asc()).all()

    cases: list[TeamCaseOut] = []
    for study in studies:
        msg_count = db.query(CaseMessage).filter(CaseMessage.study_id == study.id).count()
        assignees = [staff_profile(a.user) for a in study.assignments if a.user]
        assignees = [a for a in assignees if a is not None]
        approver = staff_profile(study.report.approver) if study.report and study.report.approver else None
        if study.report and study.report.approved and not approver and study.report.approved_by:
            approver = StaffProfileOut(
                id=0,
                dept_id="RAD",
                first_name=study.report.approved_by.replace("Dr.", "").strip(),
                last_name="",
                full_name=study.report.approved_by,
                role="radiologist",
                department="radiology",
            )

        cases.append(
            TeamCaseOut(
                study=_study_to_out(study),
                submit_source=study.submit_source or "Unknown origin",
                submitter=staff_profile(study.submitted_by),
                approver=approver,
                approved=bool(study.report and study.report.approved),
                approved_at=study.report.approved_at if study.report else None,
                assignees=assignees,
                message_count=msg_count,
            )
        )

    return TeamBoardOut(
        department=dept,
        cases=cases,
        members=[staff_profile(m) for m in members if staff_profile(m)],
    )


@router.get("/studies/{study_id}/messages", response_model=list[CaseMessageOut])
def list_messages(
    study_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    if not user_can_access_study(db, user, study_id):
        raise HTTPException(status_code=403, detail="Not assigned to this case")

    rows = (
        db.query(CaseMessage)
        .options(joinedload(CaseMessage.user))
        .filter(CaseMessage.study_id == study_id)
        .order_by(CaseMessage.created_at.asc())
        .all()
    )
    return [
        CaseMessageOut(
            id=row.id,
            study_id=row.study_id,
            body=row.body,
            created_at=row.created_at,
            author=staff_profile(row.user),
        )
        for row in rows
        if staff_profile(row.user)
    ]


@router.post("/studies/{study_id}/messages", response_model=CaseMessageOut)
def post_message(
    study_id: int,
    body: PostMessageIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    if not user_can_access_study(db, user, study_id):
        raise HTTPException(status_code=403, detail="Not assigned to this case")

    assigned = (
        db.query(StudyAssignment)
        .filter(StudyAssignment.study_id == study_id, StudyAssignment.user_id == user.id)
        .first()
    )
    if not assigned and user.role == UserRole.DOCTOR:
        db.add(
            StudyAssignment(
                study_id=study_id,
                user_id=user.id,
                department=user.department or "radiology",
            )
        )
        db.commit()

    msg = CaseMessage(study_id=study_id, user_id=user.id, body=body.body.strip())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    msg = (
        db.query(CaseMessage)
        .options(joinedload(CaseMessage.user))
        .filter(CaseMessage.id == msg.id)
        .first()
    )
    return CaseMessageOut(
        id=msg.id,
        study_id=msg.study_id,
        body=msg.body,
        created_at=msg.created_at,
        author=staff_profile(msg.user),
    )


@router.post("/studies/{study_id}/assign")
def assign_case(
    study_id: int,
    payload: AssignIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.RADIOLOGIST, UserRole.DOCTOR)),
):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    for uid in payload.user_ids:
        member = db.query(User).filter(User.id == uid, User.active.is_(True)).first()
        if not member:
            continue
        exists = (
            db.query(StudyAssignment)
            .filter(StudyAssignment.study_id == study_id, StudyAssignment.user_id == uid)
            .first()
        )
        if exists:
            continue
        db.add(
            StudyAssignment(
                study_id=study_id,
                user_id=uid,
                department=member.department or "radiology",
            )
        )
    db.commit()
    return {"ok": True}
