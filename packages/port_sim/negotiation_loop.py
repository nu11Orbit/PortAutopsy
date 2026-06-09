"""
port_sim.negotiation_loop
~~~~~~~~~~~~~~~~~~~~~~~~~
Main simulation loop: agents negotiate over rounds.
Implements from_snapshot() for counterfactual replay (ML interface).
"""

from __future__ import annotations

import dataclasses

from .agents import container_decide
from .auction import run_auction
from .containers import Container
from .resources import PortResources
from packages.autopsy_sdk import add_downstream_effect, DownstreamEffect


class NegotiationLoop:
    """
    Multi-round negotiation: containers bid for crane slots,
    auction resolves conflicts, repeat until all allocated or max_rounds.

    Uses wave-based time advancement: each wave processes a batch of
    containers, then time advances so occupied cranes free up for the
    next wave. This ensures all 200 containers can be allocated across
    multiple waves rather than stalling after the first 24.
    """

    # How long a crane is occupied per allocation (simulation hours)
    CRANE_OCCUPY_DURATION = 0.5
    # Time step between negotiation rounds within a wave
    ROUND_TIME_STEP = 0.1

    def __init__(self, containers: list[Container], resources: PortResources | None = None):
        self.containers = containers
        self.resources = resources or PortResources()
        self.t: float = 0.0
        self.allocations: dict[str, str] = {}
        self.round_history: list[dict] = []
        self.violations: list[dict] = []

    @classmethod
    def from_snapshot(
        cls,
        state_dict: dict,
        overrides: dict | None = None,
        target_agent_id: str | None = None,
    ):
        """
        Reconstruct a NegotiationLoop from a frozen state.
        ML's counterfactual engine calls this to re-run from any point.

        Args:
            state_dict: Serialized state from snapshot().
            overrides: Dict of {field: value} to override on the target agent.
            target_agent_id: If set, overrides apply ONLY to this agent.
                             If None, overrides apply to all containers (legacy).
        """
        containers = [Container(**c) for c in state_dict.get("containers", [])]

        # Apply overrides to the target agent only (or all if no target)
        if overrides:
            for c in containers:
                if target_agent_id and c.container_id != target_agent_id:
                    continue
                for k, v in overrides.items():
                    if hasattr(c, k):
                        setattr(c, k, v)

        loop = cls(containers)

        # Restore resource state
        for crane_id, crane_data in state_dict.get("resources", {}).get("cranes", {}).items():
            if crane_id in loop.resources.cranes:
                loop.resources.cranes[crane_id].occupied_until = crane_data.get(
                    "occupied_until", 0.0
                )

        loop.t = state_dict.get("t", 0.0)
        return loop

    def _detect_violations(self, agent_id: str, container: Container, slot: str, round_num: int) -> list[dict]:
        """Check for constraint violations after allocation."""
        violations = []
        crane = self.resources.cranes.get(slot)
        if not crane:
            return violations

        # Cold chain on non-refrigerated crane
        if container.cargo_type == "cold_chain" and not crane.refrigerated:
            detail = (
                f"{agent_id} ({container.cargo_type}, "
                f"temp={container.temperature_constraint}°C) "
                f"allocated to non-refrigerated {slot}"
            )
            violations.append({
                "type": "cold_chain_violation",
                "agent_id": agent_id,
                "slot": slot,
                "detail": detail,
                "t": self.t,
            })
            add_downstream_effect(agent_id, round_num, DownstreamEffect(
                target_agent=agent_id,
                effect_type="cold_chain_violation",
                variable="slot",
                detail=detail
            ))

        # Customs not cleared
        if not container.customs_cleared:
            detail = f"{agent_id} allocated but customs not cleared"
            violations.append({
                "type": "customs_violation",
                "agent_id": agent_id,
                "slot": slot,
                "detail": detail,
                "t": self.t,
            })
            add_downstream_effect(agent_id, round_num, DownstreamEffect(
                target_agent=agent_id,
                effect_type="customs_violation",
                variable="customs_cleared",
                detail=detail
            ))

        return violations

    def run(self, max_rounds: int = 10, max_waves: int = 20) -> dict[str, str]:
        """
        Run the full negotiation loop with wave-based time advancement.

        Within each wave, agents negotiate for available slots across
        multiple rounds. After a wave, time advances so previously
        occupied cranes free up for the next wave of containers.

        Returns {container_id: crane_slot} allocations.
        """
        for wave in range(max_waves):
            # Check if all containers are allocated
            unallocated = [
                c for c in self.containers
                if c.container_id not in self.allocations
            ]
            if not unallocated:
                break

            wave_allocated = 0

            for round_num in range(max_rounds):
                available = self.resources.available_slots(self.t)
                if not available:
                    break

                # Pre-compute refrigerated slots for this round
                ref_slots = self.resources.refrigerated_slots(self.t)

                # Only bid with unallocated containers
                bids = []
                for c in unallocated:
                    if c.container_id in self.allocations:
                        continue  # allocated in an earlier round this wave

                    # Skip containers that haven't cleared customs
                    if not c.customs_cleared:
                        continue

                    decision = container_decide(
                        agent_id=c.container_id,
                        container=c,
                        available_slots=available,
                        round_num=round_num,
                        refrigerated_slots=ref_slots,
                    )
                    if decision.get("action") == "BID" and decision.get("slot"):
                        bids.append({
                            "agent_id": c.container_id,
                            "slot": decision["slot"],
                            "bid_value": decision.get("bid_value", 0.5),
                        })

                if not bids:
                    break

                # Run auction
                new_allocs = run_auction(bids, self.resources)
                self.allocations.update(new_allocs)

                # Allocate resources and detect violations
                for agent_id, slot in new_allocs.items():
                    self.resources.allocate(slot, self.t + self.CRANE_OCCUPY_DURATION)

                    # Detect constraint violations
                    container = next(c for c in self.containers if c.container_id == agent_id)
                    v = self._detect_violations(agent_id, container, slot, round_num)
                    self.violations.extend(v)

                    # Update berth TEU
                    crane = self.resources.cranes[slot]
                    berth = self.resources.berths[crane.berth_id]
                    berth.current_teu += container.size_teu

                wave_allocated += len(new_allocs)

                # Record round history
                self.round_history.append({
                    "wave": wave,
                    "round": round_num,
                    "bids": len(bids),
                    "allocated": len(new_allocs),
                    "total_allocated": len(self.allocations),
                    "t": self.t,
                })

                self.t += self.ROUND_TIME_STEP

            # Advance time past occupation duration so cranes free up
            if wave_allocated > 0:
                self.t += self.CRANE_OCCUPY_DURATION

        return self.allocations

    def run_single_agent(self, trace_id: str) -> dict:
        """
        ML calls this for counterfactual replay.
        Runs only the agent associated with the trace_id.
        """
        # Extract agent_id — handle "container_047_r3" format
        agent_id = trace_id.rsplit("_r", 1)[0] if "_r" in trace_id else trace_id

        container = next(
            (c for c in self.containers if c.container_id == agent_id),
            None,
        )
        if not container:
            return {"error": f"Agent {agent_id} not found"}

        available = self.resources.available_slots(self.t)
        return container_decide(
            agent_id=agent_id,
            container=container,
            available_slots=available,
            round_num=0,
        )

    def snapshot(self) -> dict:
        """Serialize the full loop state for counterfactual replay."""
        return {
            "t": self.t,
            "containers": [dataclasses.asdict(c) for c in self.containers],
            "resources": self.resources.snapshot(),
            "allocations": self.allocations,
            "violations": self.violations,
        }
