"""
port_sim.fifo_baseline
~~~~~~~~~~~~~~~~~~~~~~
Simple FIFO allocation — no LLM, no negotiation.
Used as a baseline to show multi-agent negotiation is better.
"""

from __future__ import annotations

from .resources import PortResources


def run_fifo(containers, resources: PortResources | None = None) -> dict[str, str]:
    """
    Allocate containers in FIFO order (by dwell_time_target).
    No intelligence — first come, first served.
    Returns {container_id: crane_slot}.
    """
    if resources is None:
        resources = PortResources()

    allocations: dict[str, str] = {}

    # Sort by dwell time target (most urgent first)
    sorted_containers = sorted(containers, key=lambda x: x.dwell_time_target)

    for c in sorted_containers:
        available = resources.available_slots(0.0)
        if available:
            slot = available[0]
            allocations[c.container_id] = slot
            resources.allocate(slot, 2.0)

    return allocations
