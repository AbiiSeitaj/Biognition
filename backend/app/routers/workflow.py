from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, require_roles
from app.database import get_db
from app.models import Building, PacsNode, StudyDistribution, User, UserRole
from app.schemas import PacsNetworkOut, PacsNodeOut, WorkflowOut, WorkflowStepOut
from app.services.pacs_service import PACS_TOPOLOGY, get_workflow_counts

router = APIRouter(tags=["workflow"])


@router.get("/workflow", response_model=WorkflowOut)
def get_workflow(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    counts = get_workflow_counts(db)
    nodes = (
        db.query(PacsNode)
        .options(joinedload(PacsNode.building))
        .order_by(PacsNode.is_primary.desc(), PacsNode.id)
        .all()
    )

    sync_counts: dict[int, int] = {}
    for row in db.query(StudyDistribution).all():
        sync_counts[row.building_id] = sync_counts.get(row.building_id, 0) + 1

    pacs_nodes = [
        PacsNodeOut(
            id=n.id,
            department=n.department.value,
            name=n.name,
            is_primary=n.is_primary,
            building_code=n.building.code,
            building_name=n.building.name,
            campus=n.building.campus,
            synced_studies=sync_counts.get(n.building_id, 0),
        )
        for n in nodes
    ]

    steps = [
        WorkflowStepOut(
            id="upload",
            label="Image upload",
            subtitle="DICOM intake",
            count=counts["uploaded"],
        ),
        WorkflowStepOut(
            id="analyze",
            label="AI analysis",
            subtitle="Modality models",
            count=counts["analyzed"],
        ),
        WorkflowStepOut(
            id="archive",
            label="PACS archive",
            subtitle="Long-term storage",
            count=counts["archived"],
        ),
        WorkflowStepOut(
            id="access",
            label="Cross-dept access",
            subtitle="Department routing",
            count=counts["distributed"],
        ),
    ]

    return WorkflowOut(
        title="System flow",
        steps=steps,
        pacs_network=PacsNetworkOut(nodes=pacs_nodes, buildings=len({n.building_id for n in nodes})),
        updated_at=datetime.utcnow(),
    )
