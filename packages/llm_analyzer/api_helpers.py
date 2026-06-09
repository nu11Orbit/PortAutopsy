"""
llm_analyzer.api_helpers
~~~~~~~~~~~~~~~~~~~~~~~~
Clean functions for A3's FastAPI routes.
These return plain dicts/Pydantic models — A3 handles routing.
"""

from __future__ import annotations

from packages.causal_engine.dag_builder import build_dag, export_graph_json
from .report_generator import run_autopsy


def get_graph_json() -> dict:
    """Build the causal graph and export as D3.js-compatible JSON."""
    G = build_dag()
    return export_graph_json(G)


def get_report_json() -> dict:
    """Run the full autopsy pipeline and return the report as a dict."""
    report = run_autopsy()
    return report.model_dump()
