"""
Builds and compiles the LangGraph data-analysis pipeline.
The pipeline is compiled once at import time as a module-level singleton.
"""
from langgraph.graph import StateGraph, END
from core.analysis_agents import (
    ingestion_node,
    cleaning_node,
    analysis_node,
    insight_node,
    visualization_node,
    report_node,
)


def build_analysis_pipeline():
    """Wire up the 6-node sequential LangGraph pipeline."""
    g = StateGraph(dict)

    g.add_node("ingest",    ingestion_node)
    g.add_node("clean",     cleaning_node)
    g.add_node("analyze",   analysis_node)
    g.add_node("insight",   insight_node)
    g.add_node("visualize", visualization_node)
    g.add_node("report",    report_node)

    g.set_entry_point("ingest")
    g.add_edge("ingest",    "clean")
    g.add_edge("clean",     "analyze")
    g.add_edge("analyze",   "insight")
    g.add_edge("insight",   "visualize")
    g.add_edge("visualize", "report")
    g.add_edge("report",    END)

    return g.compile()


# Module-level singleton — compiled once on server startup
analysis_pipeline = build_analysis_pipeline()


def run_analysis(raw_bytes: bytes, filename: str, llm_model: str = "mock") -> dict:
    """
    Public entry point called by the /analysis/run API endpoint.

    Args:
        raw_bytes:  Raw file content as bytes (CSV, JSON, TSV, Excel).
        filename:   Original filename, used for extension detection.
        llm_model:  LLM model ID (e.g. 'gpt-4o-mini', 'claude-3-5-sonnet-20241022',
                    'gemini-1.5-flash', 'llama3-8b-8192'). Use 'mock' for no LLM.

    Returns:
        Completed state dict with keys: profile, analysis, insights, charts, report, logs, errors.
    """
    initial_state = {
        "raw_bytes":  raw_bytes,
        "filename":   filename,
        "llm_model":  llm_model,
        "df":         None,
        "profile":    None,
        "analysis":   None,
        "insights":   None,
        "charts":     [],
        "report":     None,
        "logs":       [],
        "errors":     [],
    }
    return analysis_pipeline.invoke(initial_state)
