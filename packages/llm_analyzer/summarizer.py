"""
llm_analyzer.summarizer
~~~~~~~~~~~~~~~~~~~~~~~
Serialize the causal graph + counterfactual data into a prompt,
then call the LLM client to generate an AutopsyReport.
"""

from __future__ import annotations

import json
import networkx as nx
from .llm_client import generate_autopsy_report
from packages.autopsy_sdk.models import AutopsyReport


def _dag_to_prompt(G: nx.DiGraph) -> str:
    """Convert a NetworkX DAG into human-readable text for the LLM."""
    lines = ["CAUSAL GRAPH OF AGENT DECISIONS:", ""]
    # Truncate graph to max 15 nodes to avoid LLM token limits (Groq 12k TPM)
    node_list = list(G.nodes(data=True))[:15]
    included_nodes = set()

    for node, data in node_list:
        included_nodes.add(node)
        lines.append(f"Agent: {data.get('agent_id', '?')} | Round: {data.get('round', '?')}")
        lines.append(f"  Trace ID: {data.get('trace_id', '?')}")
        lines.append(f"  Chain of Thought: {data.get('chain_of_thought', 'N/A')}")
        lines.append(f"  Output: {data.get('output', {})}")
        lines.append(f"  Status: {data.get('status', '?')}")
        if data.get("is_failure"):
            lines.append("  ⚠️  THIS NODE IS A FAILURE")
        lines.append("")

    lines.append("CAUSAL EDGES:")
    for u, v, d in list(G.edges(data=True))[:30]:
        if u in included_nodes or v in included_nodes:
            effect = d.get("effect_type", "unknown")
            variable = d.get("variable", "")
            lines.append(f"  {u} -> {v}  [{effect}] {variable}")

    return "\n".join(lines)


def generate_report(G: nx.DiGraph, cf_result: dict) -> AutopsyReport:
    """
    Build the full prompt from graph + counterfactual data,
    then call the LLM to produce an AutopsyReport.
    """
    dag_text = _dag_to_prompt(G)
    cf_text = json.dumps(cf_result, indent=2, default=str)

    prompt = f"""You are debugging a multi-agent port logistics simulation where 200 container-agents negotiate for crane slots at a shipping port.

{dag_text}

COUNTERFACTUAL ANALYSIS:
{cf_text}

Based on this causal graph and counterfactual data, produce a root cause analysis.
Be specific about which agent made the bad decision, explain the full causal chain
from root cause to observable failure, describe what would have happened differently
with the counterfactual fix, and suggest a concrete one-line code fix.
Set confidence between 0.85 and 0.98 based on how clear the causal chain is."""

    return generate_autopsy_report(prompt)
