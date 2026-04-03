from fastapi import APIRouter

router = APIRouter()

AVAILABLE_MODELS = [
    {
        "id": "gpt-4o",
        "label": "GPT-4o",
        "provider": "OpenAI",
        "context": 128000,
        "cost_per_1k": 0.005,
    },
    {
        "id": "gpt-4o-mini",
        "label": "GPT-4o Mini",
        "provider": "OpenAI",
        "context": 128000,
        "cost_per_1k": 0.00015,
    },
    {
        "id": "gpt-3.5-turbo",
        "label": "GPT-3.5 Turbo",
        "provider": "OpenAI",
        "context": 16385,
        "cost_per_1k": 0.0005,
    },
    {
        "id": "claude-3-5-sonnet-20241022",
        "label": "Claude 3.5 Sonnet",
        "provider": "Anthropic",
        "context": 200000,
        "cost_per_1k": 0.003,
    },
    {
        "id": "claude-3-haiku-20240307",
        "label": "Claude 3 Haiku",
        "provider": "Anthropic",
        "context": 200000,
        "cost_per_1k": 0.00025,
    },
    {
        "id": "gemini-1.5-pro",
        "label": "Gemini 1.5 Pro",
        "provider": "Google",
        "context": 1000000,
        "cost_per_1k": 0.00125,
    },
    {
        "id": "llama-3.3-70b-versatile",
        "label": "Llama 3.3 70B (Groq)",
        "provider": "Groq",
        "context": 128000,
        "cost_per_1k": 0.0,
    },
    {
        "id": "mock",
        "label": "Mock (No API Key)",
        "provider": "Mock",
        "context": 4096,
        "cost_per_1k": 0.0,
    },
]

AVAILABLE_TOOLS = [
    {
        "id": "python_repl",
        "label": "Python REPL",
        "description": "Execute Python code and return stdout output",
    },
    {
        "id": "web_search",
        "label": "Web Search",
        "description": "Search the web using DuckDuckGo",
    },
    {
        "id": "file_reader",
        "label": "File Reader",
        "description": "Read CSV, JSON, or TXT files from disk",
    },
    {
        "id": "sql_query",
        "label": "SQL Query",
        "description": "Run SQL queries against a connected database",
    },
    {
        "id": "chart_gen",
        "label": "Chart Generator",
        "description": "Generate Matplotlib/Plotly visualisation charts",
    },
]

TOPOLOGY_TEMPLATES = [
    {
        "id": "hierarchical",
        "label": "Hierarchical",
        "description": "Coordinator delegates to specialised sub-agents",
        "icon": "🏢",
        "default_agents": ["coordinator", "researcher", "analyst", "coder"],
        "edges": [
            {"source": "coordinator", "target": "researcher"},
            {"source": "coordinator", "target": "analyst"},
            {"source": "coordinator", "target": "coder"},
        ],
    },
    {
        "id": "sequential",
        "label": "Sequential",
        "description": "Agents run one after another in a chain",
        "icon": "⛓️",
        "default_agents": ["planner", "researcher", "analyst", "critic"],
        "edges": [
            {"source": "planner",    "target": "researcher"},
            {"source": "researcher", "target": "analyst"},
            {"source": "analyst",    "target": "critic"},
        ],
    },
    {
        "id": "star",
        "label": "Star",
        "description": "All agents connect to and from a central hub",
        "icon": "⭐",
        "default_agents": ["coordinator", "researcher", "analyst", "coder", "critic"],
        "edges": [
            {"source": "coordinator", "target": "researcher"},
            {"source": "coordinator", "target": "analyst"},
            {"source": "coordinator", "target": "coder"},
            {"source": "coordinator", "target": "critic"},
        ],
    },
    {
        "id": "peer_to_peer",
        "label": "Peer-to-Peer",
        "description": "Agents communicate directly with each other",
        "icon": "🔗",
        "default_agents": ["researcher", "analyst", "coder"],
        "edges": [
            {"source": "researcher", "target": "analyst"},
            {"source": "analyst",    "target": "coder"},
            {"source": "coder",      "target": "researcher"},
        ],
    },
    {
        "id": "custom",
        "label": "Custom",
        "description": "Build your own topology from scratch",
        "icon": "✏️",
        "default_agents": [],
        "edges": [],
    },
]


@router.get("/available")
def get_models():
    return AVAILABLE_MODELS


@router.get("/tools")
def get_tools():
    return AVAILABLE_TOOLS


@router.get("/topologies")
def get_topologies():
    return TOPOLOGY_TEMPLATES
