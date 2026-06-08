from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routers import agents, models, workflows, experiments
from routers.analysis import router as analysis_router
from db.database import init_db

load_dotenv()

app = FastAPI(
    title="MAS Visual Builder API",
    version="2.0.0",
    description=(
        "Multi-Agent System for workflow orchestration, "
        "data analysis, and AI-powered visualization."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()
    os.makedirs("outputs/charts", exist_ok=True)


app.include_router(agents.router,      prefix="/agents",      tags=["Agents"])
app.include_router(models.router,      prefix="/models",      tags=["Models"])
app.include_router(workflows.router,   prefix="/workflows",   tags=["Workflows"])
app.include_router(experiments.router, prefix="/experiments", tags=["Experiments"])
app.include_router(analysis_router,    prefix="/analysis",    tags=["Data Analysis"])


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
