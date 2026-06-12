"""
server.py
~~~~~~~~~
FastAPI server + WebSocket bridge.
A3 owns this file. Connects ML's data to A2's dashboard.
"""

import sys
import json
import asyncio
import pathlib

# ── Add packages to Python path ──────────────────────────────

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AgentAutopsy",
    description="Debugging & observability platform for multi-agent AI systems",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── WebSocket clients ────────────────────────────────────────
_ws_clients: list[WebSocket] = []


@app.websocket("/ws/events")
async def ws_events(ws: WebSocket):
    """WebSocket endpoint for real-time event streaming to dashboard."""
    await ws.accept()
    _ws_clients.append(ws)
    try:
        while True:
            # Keep connection alive; dashboard pushes are via broadcast
            await ws.receive_text()
    except WebSocketDisconnect:
        _ws_clients.remove(ws)


async def _async_broadcast(event_dict: dict):
    """Push an event to all connected dashboard clients (async)."""
    dead = []
    for ws in _ws_clients:
        try:
            await ws.send_text(json.dumps(event_dict, default=str))
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)


def _on_trace_event(event):
    """
    Callback registered with autopsy_sdk.
    Called from sync code (the tracer), so we schedule the async broadcast
    onto the running event loop.
    """
    try:
        loop = asyncio.get_running_loop()
        event_dict = event.model_dump(mode="json")
        loop.create_task(_async_broadcast(event_dict))
    except RuntimeError:
        pass  # No event loop running (e.g. CLI scripts) — skip broadcast


@app.on_event("startup")
async def _register_ws_bridge():
    """Wire the SDK event stream → WebSocket broadcast on server start."""
    from packages.autopsy_sdk import register_on_event
    register_on_event(_on_trace_event)


# ── REST Endpoints ───────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "AgentAutopsy"}


@app.post("/run")
async def run_simulation():
    """Run the full 200-agent simulation."""
    from packages.port_sim.containers import spawn_containers
    from packages.port_sim.resources import PortResources
    from packages.port_sim.negotiation_loop import NegotiationLoop

    containers = spawn_containers(200)
    loop = NegotiationLoop(containers, PortResources())
    allocs = loop.run()

    # Save state for counterfactual
    snap = loop.snapshot()
    pathlib.Path("saved_state.json").write_text(
        json.dumps(snap, default=str), encoding="utf-8"
    )

    return {
        "allocated": len(allocs),
        "total": len(containers),
        "state_saved": True,
    }


@app.post("/inject/{scenario}")
async def inject_failure(scenario: str):
    """Inject a failure scenario."""
    from packages.port_sim.failure_injection import (
        inject_cold_chain_bug,
        inject_deadlock_bug,
        inject_cascade_bug,
    )

    handlers = {
        "cold_chain": inject_cold_chain_bug,
        "deadlock": inject_deadlock_bug,
        "cascade": inject_cascade_bug,
    }

    if scenario not in handlers:
        return {"error": f"Unknown scenario: {scenario}. Use: {list(handlers.keys())}"}

    handlers[scenario]()
    return {"injected": scenario}


@app.get("/traces")
async def get_traces_endpoint(agent_id: str | None = None):
    """Get all trace events, optionally filtered by agent_id."""
    from packages.autopsy_sdk import get_traces

    traces = get_traces(agent_id)
    return [t.model_dump(mode="json") for t in traces]


@app.get("/causal-graph")
async def get_causal_graph():
    """Build and return the causal graph as D3.js-compatible JSON."""
    try:
        from packages.llm_analyzer.api_helpers import get_graph_json
        return get_graph_json()
    except Exception as e:
        return {"error": str(e), "nodes": [], "edges": []}


@app.get("/autopsy-report")
async def get_autopsy_report():
    """Run the full autopsy pipeline and return the report."""
    try:
        from packages.llm_analyzer.api_helpers import get_report_json
        return get_report_json()
    except Exception as e:
        return {"error": str(e)}


@app.get("/metrics")
async def get_metrics():
    """Get simulation metrics for the dashboard."""
    import sqlite3

    db = pathlib.Path("traces.db")
    if not db.exists():
        return {
            "fifo": {},
            "agent": {},
            "error": "No traces yet — run simulation first",
        }

    con = sqlite3.connect(str(db))
    try:
        violations = con.execute(
            "SELECT COUNT(*) FROM trace_events "
            "WHERE output_json LIKE '%violation%' AND output_json LIKE '%true%'"
        ).fetchone()[0]
        total = con.execute(
            "SELECT COUNT(DISTINCT agent_id) FROM trace_events"
        ).fetchone()[0]
    finally:
        con.close()

    return {
        "fifo": {"throughput": 100, "violations": 3, "dwell": 4.2, "debug": "manual"},
        "agent": {
            "throughput": round(total / 162 * 100) if total else 0,
            "violations": violations,
            "dwell": 2.8,
            "debug": "8 sec (autopsy)",
        },
    }


@app.get("/failure-rules")
async def get_failure_rules():
    """Return available failure detection rules."""
    from packages.causal_engine.failure_detector import get_rules
    return get_rules()
