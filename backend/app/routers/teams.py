from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.auth import require_roles
from app.database import get_db
from app.models import CaseMessage, Department, Report, Study, StudyAssignment, StudyDistribution, User, UserRole
from app.routers.studies import _study_to_out
from app.schemas import CaseMessageOut, StaffProfileOut, TeamBoardOut, TeamCaseOut
from app.services.case_message_store import add_message as add_memory_message
from app.services.case_message_store import count_messages as memory_message_count
from app.services.case_message_store import list_messages as list_memory_messages
from app.services.team_service import auto_assign_study, seed_welcome_messages, staff_profile, user_can_access_study, user_is_assigned_to_study

router = APIRouter(prefix="/teams", tags=["teams"])


class PostMessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class AssignIn(BaseModel):
    user_ids: list[int] = Field(default_factory=list)


def _message_count(db: Session, study_id: int) -> int:
    db_count = db.query(CaseMessage).filter(CaseMessage.study_id == study_id).count()
    return db_count + memory_message_count(study_id)


def _collect_messages(db: Session, study_id: int) -> list[CaseMessageOut]:
    db_rows = (
        db.query(CaseMessage)
        .options(joinedload(CaseMessage.user))
        .filter(CaseMessage.study_id == study_id)
        .order_by(CaseMessage.created_at.asc())
        .all()
    )
    out: list[CaseMessageOut] = []
    for row in db_rows:
        author = staff_profile(row.user)
        if author:
            out.append(
                CaseMessageOut(
                    id=row.id,
                    study_id=row.study_id,
                    body=row.body,
                    created_at=row.created_at,
                    author=author,
                )
            )

    user_ids = {row.user_id for row in list_memory_messages(study_id)}
    users_by_id: dict[int, User] = {}
    if user_ids:
        users_by_id = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()}

    for row in list_memory_messages(study_id):
        author = staff_profile(users_by_id.get(row.user_id))
        if author:
            out.append(
                CaseMessageOut(
                    id=row.id,
                    study_id=row.study_id,
                    body=row.body,
                    created_at=row.created_at,
                    author=author,
                )
            )

    out.sort(key=lambda m: m.created_at)
    return out


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
                message_count=_message_count(db, study.id),
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

    return _collect_messages(db, study_id)


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
    if not user_is_assigned_to_study(db, user, study_id) and user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(
            status_code=403,
            detail="Only clinicians assigned to this case can post comments",
        )

    msg = add_memory_message(study_id, user.id, body.body.strip())
    author = staff_profile(user)
    if not author:
        raise HTTPException(status_code=500, detail="Could not resolve author profile")

    return CaseMessageOut(
        id=msg.id,
        study_id=msg.study_id,
        body=msg.body,
        created_at=msg.created_at,
        author=author,
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
