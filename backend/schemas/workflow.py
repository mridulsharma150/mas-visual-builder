from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class AgentConfig(BaseModel):
    id: str
    role: str
    model: str
    strategy: str = "ReAct"
    tools: List[str] = []
    system_prompt: str = ""
    max_iterations: int = 5
    position: Dict[str, float] = {"x": 0, "y": 0}


class EdgeConfig(BaseModel):
    source: str
    target: str
    type: str = "default"


class WorkflowCreate(BaseModel):
    name: str
    topology: str
    agents: List[AgentConfig]
    edges: List[EdgeConfig]


class RunRequest(BaseModel):
    input_prompt: str
    dataset_path: Optional[str] = None
