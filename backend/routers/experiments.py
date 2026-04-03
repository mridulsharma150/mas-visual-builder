from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db, Workflow, Experiment
from schemas.workflow import RunRequest
from core.orchestrator import run_workflow
import uuid
import json
import time

router = APIRouter()


@router.post("/{workflow_id}/run")
def run_experiment(
    workflow_id: str,
    req: RunRequest,
    db: Session = Depends(get_db),
):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    config = json.loads(wf.config_json)
    start = time.time()
    result = run_workflow(config, req.input_prompt)
    elapsed_ms = round((time.time() - start) * 1000, 2)

    exp = Experiment(
        id=str(uuid.uuid4()),
        workflow_id=workflow_id,
        workflow_name=wf.name,
        status="completed" if result.get("success") else "failed",
        input_prompt=req.input_prompt,
        output_text=result.get("output", ""),
        logs_json=json.dumps(result.get("logs", [])),
        latency_ms=elapsed_ms,
        total_tokens=result.get("total_tokens", 0),
        agent_calls=result.get("agent_calls", 0),
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)

    return {
        "experiment_id": exp.id,
        "status": exp.status,
        "output": exp.output_text,
        "logs": result.get("logs", []),
        "latency_ms": exp.latency_ms,
        "total_tokens": exp.total_tokens,
        "agent_calls": exp.agent_calls,
    }


@router.get("/")
def list_experiments(db: Session = Depends(get_db)):
    exps = db.query(Experiment).order_by(Experiment.created_at.desc()).limit(50).all()
    return [
        {
            "id": e.id,
            "workflow_name": e.workflow_name,
            "status": e.status,
            "latency_ms": e.latency_ms,
            "total_tokens": e.total_tokens,
            "agent_calls": e.agent_calls,
            "created_at": str(e.created_at),
        }
        for e in exps
    ]


@router.get("/{experiment_id}")
def get_experiment(experiment_id: str, db: Session = Depends(get_db)):
    e = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return {
        "id": e.id,
        "workflow_name": e.workflow_name,
        "status": e.status,
        "input_prompt": e.input_prompt,
        "output": e.output_text,
        "logs": json.loads(e.logs_json or "[]"),
        "latency_ms": e.latency_ms,
        "total_tokens": e.total_tokens,
        "agent_calls": e.agent_calls,
        "created_at": str(e.created_at),
    }
