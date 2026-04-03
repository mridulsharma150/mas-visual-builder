from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db, Workflow
from schemas.workflow import WorkflowCreate
import uuid
import json

router = APIRouter()


@router.post("/")
def create_workflow(payload: WorkflowCreate, db: Session = Depends(get_db)):
    wf = Workflow(
        id=str(uuid.uuid4()),
        name=payload.name,
        topology=payload.topology,
        config_json=json.dumps(payload.model_dump()),
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return {"id": wf.id, "name": wf.name, "topology": wf.topology}


@router.get("/")
def list_workflows(db: Session = Depends(get_db)):
    wfs = db.query(Workflow).order_by(Workflow.created_at.desc()).all()
    return [
        {
            "id": w.id,
            "name": w.name,
            "topology": w.topology,
            "created_at": str(w.created_at),
        }
        for w in wfs
    ]


@router.get("/{workflow_id}")
def get_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {**json.loads(wf.config_json), "id": wf.id, "created_at": str(wf.created_at)}


@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()
    return {"deleted": workflow_id}
