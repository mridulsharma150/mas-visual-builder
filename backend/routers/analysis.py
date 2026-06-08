"""
/analysis router — full data-analysis pipeline endpoints.

Endpoints:
  POST  /analysis/run              Upload a file; run the 6-agent pipeline.
  GET   /analysis/jobs             List all past analysis jobs (last 100).
  GET   /analysis/jobs/{id}        Get full result of a specific job.
  GET   /analysis/jobs/{id}/report Download the Markdown report as plain text.
"""
import json
import time
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from db.database import AnalysisJob, get_db
from core.analysis_pipeline import run_analysis

router = APIRouter()

ALLOWED_EXTENSIONS = {"csv", "json", "tsv", "xlsx", "xls"}
MAX_FILE_SIZE_MB   = 50


@router.post("/run")
async def run_analysis_endpoint(
    file: UploadFile = File(...),
    llm_model: str   = Form(default="mock"),
    db: Session      = Depends(get_db),
):
    """
    Upload a data file and run the full multi-agent analysis pipeline.

    - **file**: CSV, JSON, TSV, XLS, or XLSX (max 50 MB)
    - **llm_model**: LLM to use for AI insights (default: `mock` for offline use).
      Options: `gpt-4o-mini`, `claude-3-5-sonnet-20241022`, `gemini-1.5-flash`,
      `llama3-8b-8192` (Groq), or `mock`.
    """
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds the {MAX_FILE_SIZE_MB} MB limit.",
        )

    # Create job record immediately (status=running)
    job_id = str(uuid.uuid4())
    job = AnalysisJob(id=job_id, filename=file.filename, status="running")
    db.add(job)
    db.commit()

    start = time.time()
    try:
        result     = run_analysis(raw_bytes, file.filename, llm_model)
        elapsed_ms = round((time.time() - start) * 1000, 2)
        errors     = result.get("errors", [])

        job.status           = "completed" if not errors else "partial"
        job.profile_json     = json.dumps(result.get("profile") or {})
        job.stats_json       = json.dumps(result.get("analysis") or {})
        job.insights_text    = result.get("insights") or ""
        job.chart_paths_json = json.dumps([c.get("title") for c in result.get("charts", [])])
        job.report_md        = result.get("report") or ""
        job.error_text       = "; ".join(errors) if errors else None
        job.latency_ms       = elapsed_ms

    except Exception as exc:
        elapsed_ms       = round((time.time() - start) * 1000, 2)
        job.status       = "failed"
        job.error_text   = str(exc)
        job.latency_ms   = elapsed_ms
        db.commit()
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")

    db.commit()
    db.refresh(job)

    # Embed base64 PNG only for the first 3 charts to keep response size manageable
    charts_out = [
        {
            "title":       c["title"],
            "type":        c["type"],
            "plotly_json": c["plotly_json"],
            "has_png":     c.get("base64_png") is not None,
            "base64_png":  c.get("base64_png") if i < 3 else None,
        }
        for i, c in enumerate(result.get("charts", []))
    ]

    return {
        "job_id":     job.id,
        "filename":   job.filename,
        "status":     job.status,
        "latency_ms": job.latency_ms,
        "profile":    result.get("profile"),
        "analysis":   result.get("analysis"),
        "insights":   result.get("insights"),
        "charts":     charts_out,
        "logs":       result.get("logs", []),
        "errors":     result.get("errors", []),
    }


@router.get("/jobs")
def list_jobs(db: Session = Depends(get_db)):
    """List the last 100 analysis jobs, newest first."""
    jobs = (
        db.query(AnalysisJob)
        .order_by(AnalysisJob.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id":         j.id,
            "filename":   j.filename,
            "status":     j.status,
            "latency_ms": j.latency_ms,
            "created_at": str(j.created_at),
        }
        for j in jobs
    ]


@router.get("/jobs/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Return the full result of a completed analysis job."""
    j = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return {
        "id":         j.id,
        "filename":   j.filename,
        "status":     j.status,
        "profile":    json.loads(j.profile_json  or "{}"),
        "analysis":   json.loads(j.stats_json    or "{}"),
        "insights":   j.insights_text,
        "charts":     json.loads(j.chart_paths_json or "[]"),
        "report":     j.report_md,
        "error":      j.error_text,
        "latency_ms": j.latency_ms,
        "created_at": str(j.created_at),
    }


@router.get("/jobs/{job_id}/report", response_class=PlainTextResponse)
def download_report(job_id: str, db: Session = Depends(get_db)):
    """Download the auto-generated Markdown report for a job."""
    j = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    return j.report_md or "# No report available"
