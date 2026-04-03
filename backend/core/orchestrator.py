import os
import time
import random
from typing import Dict, Any, List

MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"

MOCK_RESPONSES = {
    "coordinator": (
        "Task received. Delegating: (1) Researcher will gather data, "
        "(2) Analyst will process results, (3) Coder will implement solution."
    ),
    "planner": (
        "Execution plan: Step 1 — Define scope and requirements. "
        "Step 2 — Collect relevant data. "
        "Step 3 — Analyse patterns and anomalies. "
        "Step 4 — Generate insights report."
    ),
    "researcher": (
        "Research complete. Found 4 relevant sources. "
        "Key finding: Dataset shows 23% growth YoY with peak activity in Q3. "
        "Confidence: high."
    ),
    "analyst": (
        "Analysis complete. Mean = 42.5, Std Dev = 8.3, Median = 41.0. "
        "Trend: upward. Outliers detected: 3 rows. "
        "Recommendation: normalise before modelling."
    ),
    "coder": (
        "Code generated and tested successfully:\n"
        "```python\n"
        "result = df.groupby('category').agg({'value': ['mean', 'std']})\n"
        "print(result)\n"
        "```\n"
        "Output: category_A=41.2, category_B=43.8"
    ),
    "critic": (
        "Review score: 8/10. Strengths: clear structure, data-backed. "
        "Issues: missing confidence intervals, no baseline comparison. "
        "Suggested fix: add error bars and compare against prior period."
    ),
}


def run_workflow(config: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    agents = config.get("agents", [])
    logs: List[Dict] = []

    if MOCK_MODE:
        return _mock_run(agents, prompt, logs)

    try:
        return _langgraph_run(config, agents, prompt, logs)
    except Exception as exc:
        return {
            "success": False,
            "output": f"Orchestration error: {exc}",
            "logs": logs,
            "total_tokens": 0,
            "agent_calls": 0,
        }


def _mock_run(agents: list, prompt: str, logs: list) -> Dict[str, Any]:
    total_tokens = 0
    for ag in agents:
        time.sleep(0.04)
        role = ag.get("role", "coordinator")
        tokens = random.randint(120, 600)
        total_tokens += tokens
        logs.append(
            {
                "agent": ag.get("id", role),
                "role": role,
                "model": ag.get("model", "mock"),
                "input": (prompt[:80] + "…") if len(prompt) > 80 else prompt,
                "output": MOCK_RESPONSES.get(role, f"[{role}] processed the request."),
                "tokens": tokens,
                "latency_ms": random.randint(150, 850),
            }
        )
    final_output = logs[-1]["output"] if logs else "No agents configured."
    return {
        "success": True,
        "output": final_output,
        "logs": logs,
        "total_tokens": total_tokens,
        "agent_calls": len(agents),
    }


def _langgraph_run(
    config: Dict[str, Any], agents: list, prompt: str, logs: list
) -> Dict[str, Any]:
    from langgraph.graph import StateGraph, END
    from typing import TypedDict
    from core.agent_factory import build_agent

    class State(TypedDict):
        messages: list
        current_output: str

    g = StateGraph(State)

    for ag in agents:
        fn = build_agent(ag)
        g.add_node(ag["id"], fn)

    raw_edges = config.get("edges", [])
    for edge in raw_edges:
        g.add_edge(edge["source"], edge["target"])

    if agents:
        g.set_entry_point(agents[0]["id"])
        g.add_edge(agents[-1]["id"], END)

    app = g.compile()
    result = app.invoke(
        {"messages": [{"role": "user", "content": prompt}], "current_output": ""}
    )

    return {
        "success": True,
        "output": result.get("current_output", ""),
        "logs": logs,
        "total_tokens": 0,
        "agent_calls": len(agents),
    }
