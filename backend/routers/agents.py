from fastapi import APIRouter

router = APIRouter()

PREDEFINED_AGENTS = [
    {
        "role": "coordinator",
        "label": "Coordinator",
        "color": "#6366f1",
        "icon": "🧭",
        "description": "Orchestrates the workflow; delegates to sub-agents.",
        "default_model": "gpt-4o",
        "default_strategy": "ReAct",
        "default_tools": [],
        "default_prompt": (
            "You are the coordinator agent. Your job is to understand the user's "
            "goal, break it into sub-tasks, and delegate each sub-task to the most "
            "appropriate agent. Summarise all results into a final coherent answer."
        ),
    },
    {
        "role": "planner",
        "label": "Planner",
        "color": "#f59e0b",
        "icon": "📋",
        "description": "Produces step-by-step plans from high-level goals.",
        "default_model": "gpt-4o",
        "default_strategy": "CoT",
        "default_tools": [],
        "default_prompt": (
            "You are the planner agent. Given a high-level goal, produce a numbered "
            "step-by-step execution plan. Be specific, ordered, and concise."
        ),
    },
    {
        "role": "researcher",
        "label": "Researcher",
        "color": "#10b981",
        "icon": "🔍",
        "description": "Searches and retrieves information using tools.",
        "default_model": "claude-3-5-sonnet-20241022",
        "default_strategy": "ReAct",
        "default_tools": ["web_search", "file_reader"],
        "default_prompt": (
            "You are the researcher agent. Find relevant, accurate information using "
            "available tools. Cite sources and summarise findings concisely."
        ),
    },
    {
        "role": "analyst",
        "label": "Analyst",
        "color": "#3b82f6",
        "icon": "📊",
        "description": "Performs statistical analysis and extracts insights.",
        "default_model": "gpt-4o",
        "default_strategy": "ReAct",
        "default_tools": ["python_repl", "sql_query", "chart_gen"],
        "default_prompt": (
            "You are the data analyst agent. Analyse the provided data thoroughly. "
            "Return structured insights including statistics, trends, and recommendations."
        ),
    },
    {
        "role": "coder",
        "label": "Coder",
        "color": "#8b5cf6",
        "icon": "💻",
        "description": "Writes, debugs, and executes Python code.",
        "default_model": "gpt-4o",
        "default_strategy": "ReAct",
        "default_tools": ["python_repl"],
        "default_prompt": (
            "You are a senior Python engineer. Write clean, tested, working code. "
            "Always verify your code runs correctly before returning it."
        ),
    },
    {
        "role": "critic",
        "label": "Critic",
        "color": "#ef4444",
        "icon": "🔎",
        "description": "Reviews output from other agents; requests revisions.",
        "default_model": "claude-3-5-sonnet-20241022",
        "default_strategy": "ReAct",
        "default_tools": [],
        "default_prompt": (
            "You are the critic agent. Evaluate the output critically. "
            "Identify flaws, gaps, or inaccuracies and suggest specific improvements. "
            "Rate quality from 1-10 and explain your score."
        ),
    },
]


@router.get("/predefined")
def get_predefined_agents():
    return PREDEFINED_AGENTS
