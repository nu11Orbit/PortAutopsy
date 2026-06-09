"""
port_sim.fifo_baseline
~~~~~~~~~~~~~~~~~~~~~~
Simple FIFO allocation — no LLM, no negotiation.
Used as a baseline to show multi-agent negotiation is better.
"""

from __future__ import annotations

from .resources import PortResources


# How long a crane is occupied per allocation (matches negotiation loop)
_CRANE_OCCUPY_DURATION = 0.5


def run_fifo(containers, resources: PortResources | None = None) -> dict[str, str]:
    """
    Allocate containers in FIFO order (by dwell_time_target).
    No intelligence — first come, first served.
    Uses wave-based time advancement so all containers get processed.
    Returns {container_id: crane_slot}.
    """
    if resources is None:
        resources = PortResources()

    allocations: dict[str, str] = {}
    t = 0.0

    # Sort by dwell time target (most urgent first)
    sorted_containers = sorted(containers, key=lambda x: x.dwell_time_target)

    # Filter out containers without customs clearance
    eligible = [c for c in sorted_containers if c.customs_cleared]

    max_waves = 20
    for _ in range(max_waves):
        remaining = [c for c in eligible if c.container_id not in allocations]
        if not remaining:
            break

        wave_allocated = False
        for c in remaining:
            available = resources.available_slots(t)
            if not available:
                break
            slot = available[0]
            allocations[c.container_id] = slot
            resources.allocate(slot, t + _CRANE_OCCUPY_DURATION)
            wave_allocated = True

        # Advance time so occupied cranes free up
        if wave_allocated:
            t += _CRANE_OCCUPY_DURATION

    return allocations
