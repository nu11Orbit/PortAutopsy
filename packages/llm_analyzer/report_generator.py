"""
llm_analyzer.report_generator
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Orchestrates the full autopsy pipeline:
  1. Build causal graph from traces
  2. Detect failures
  3. Run counterfactual on the worst failure
  4. Generate LLM report
  5. Save to disk
"""

from __future__ import annotations

import json
import pathlib
from packages.causal_engine.dag_builder import build_dag
from packages.causal_engine.failure_detector import detect_failures
from packages.causal_engine.counterfactual import run_counterfactual
from .summarizer import generate_report
from packages.autopsy_sdk.models import AutopsyReport


def run_autopsy(
    frozen_state: dict | None = None,
    input_override: dict | None = None,
) -> AutopsyReport:
    """
    Run the full autopsy pipeline end-to-end.

    Args:
        frozen_state: optional simulation snapshot for counterfactual replay
        input_override: optional input overrides for the counterfactual

    Returns:
        A validated AutopsyReport with root cause, causal chain, and fix.
    """
    print("\n[*] Running AgentAutopsy pipeline...")

    # ── Step 1: Build causal graph ───────────────────────────
    print("  [1/5] Building causal graph from traces...")
    G = build_dag()
    print(f"        -> {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    # ── Step 2: Detect failures ──────────────────────────────
    print("  [2/5] Scanning for failures...")
    failures = detect_failures()
    if not failures:
        print("  [OK] No failures detected!")
        return AutopsyReport(
            failure="No failures detected in the current trace data.",
            root_cause_agent="none",
            root_cause_decision="All agents operated correctly.",
            causal_chain=["No causal chain — system healthy."],
            counterfactual="N/A — no failure to analyze.",
            suggested_fix="No fix needed.",
            confidence=1.0,
        )

    root = failures[0]  # Highest severity
    print(f"        -> {len(failures)} failures found. Worst: {root.rule_name} "
          f"(severity {root.severity}/10) by {root.agent_id}")

    # ── Step 3: Run counterfactual ───────────────────────────
    print("  [3/5] Running counterfactual replay...")
    override = input_override or {"temperature_constraint": 4.0}
    cf = run_counterfactual(root.trace_id, override, frozen_state or {})
    changed_str = "[YES] outcome changed" if cf["changed"] else "[!] no change"
    print(f"        -> {changed_str}")

    # ── Step 4: Generate LLM report ──────────────────────────
    print("  [4/5] Generating autopsy report via LLM...")
    report = generate_report(G, cf)

    # ── Step 5: Save to disk ─────────────────────────────────
    print("  [5/5] Saving report...")
    out_path = pathlib.Path("autopsy_report.json")
    out_path.write_text(report.model_dump_json(indent=2), encoding="utf-8")

    # ── Print summary ────────────────────────────────────────
    print(f"\n{'=' * 56}")
    print(f"  AUTOPSY REPORT")
    print(f"{'=' * 56}")
    print(f"  Root cause:  {report.root_cause_agent}")
    print(f"  Decision:    {report.root_cause_decision}")
    print(f"  Confidence:  {report.confidence:.0%}")
    print(f"{'-' * 56}")
    print(f"  Causal chain:")
    for i, step in enumerate(report.causal_chain, 1):
        print(f"    {i}. {step}")
    print(f"{'-' * 56}")
    print(f"  Fix: {report.suggested_fix}")
    print(f"{'-' * 56}")
    print(f"  Counterfactual: {report.counterfactual}")
    print(f"{'=' * 56}")
    print(f"\n  Full report saved to: {out_path.absolute()}\n")

    return report
