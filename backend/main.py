from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import agents, models, workflows, experiments
from db.database import init_db

load_dotenv()

app = FastAPI(title="MAS Visual Builder API", version="1.0.0")

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

app.include_router(agents.router,      prefix="/agents",      tags=["Agents"])
app.include_router(models.router,      prefix="/models",      tags=["Models"])
app.include_router(workflows.router,   prefix="/workflows",   tags=["Workflows"])
app.include_router(experiments.router, prefix="/experiments", tags=["Experiments"])

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
