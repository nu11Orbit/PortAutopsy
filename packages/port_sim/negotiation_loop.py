"""
port_sim.negotiation_loop
~~~~~~~~~~~~~~~~~~~~~~~~~
Main simulation loop: agents negotiate over rounds.
Implements from_snapshot() for counterfactual replay (ML interface).
"""

from __future__ import annotations

from .agents import container_decide
from .auction import run_auction
from .resources import PortResources


class NegotiationLoop:
    """
    Multi-round negotiation: containers bid for crane slots,
    auction resolves conflicts, repeat until all allocated or max_rounds.
    """

    def __init__(self, containers, resources: PortResources | None = None):
        self.containers = containers
        self.resources = resources or PortResources()
        self.t: float = 0.0
        self.allocations: dict[str, str] = {}
        self.round_history: list[dict] = []

    @classmethod
    def from_snapshot(cls, state_dict: dict, overrides: dict | None = None):
        """
        Reconstruct a NegotiationLoop from a frozen state.
        ML's counterfactual engine calls this to re-run from any point.
        """
        from .containers import Container

        containers = [Container(**c) for c in state_dict.get("containers", [])]

        # Apply overrides to all matching containers
        if overrides:
            for c in containers:
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

    def run(self, max_rounds: int = 10) -> dict[str, str]:
        """
        Run the full negotiation loop.
        Returns {container_id: crane_slot} allocations.
        """
        for round_num in range(max_rounds):
            available = self.resources.available_slots(self.t)
            if not available:
                break

            bids = []
            for c in self.containers:
                if c.container_id not in self.allocations:
                    decision = container_decide(
                        agent_id=c.container_id,
                        container=c,
                        available_slots=available,
                        round_num=round_num,
                    )
                    if decision.get("action") == "BID" and decision.get("slot"):
                        bids.append({
                            "agent_id": c.container_id,
                            "slot": decision["slot"],
                            "bid_value": decision.get("bid_value", 0.5),
                        })

            # Run auction
            new_allocs = run_auction(bids, self.resources)
            self.allocations.update(new_allocs)

            # Allocate resources
            for agent_id, slot in new_allocs.items():
                self.resources.allocate(slot, self.t + 2.0)

            # Record round history
            self.round_history.append({
                "round": round_num,
                "bids": len(bids),
                "allocated": len(new_allocs),
                "total_allocated": len(self.allocations),
            })

            self.t += 0.5

        return self.allocations

    def run_single_agent(self, trace_id: str) -> dict:
        """
        ML calls this for counterfactual replay.
        Runs only the agent associated with the trace_id.
        """
        # Extract agent_id from trace_id or node_id format
        agent_id = trace_id
        if "_r" in trace_id:
            agent_id = trace_id.split("_r")[0]
            # Handle "container_047_r3" format
            parts = trace_id.rsplit("_r", 1)
            agent_id = parts[0]

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
            "containers": [c.__dict__ for c in self.containers],
            "resources": self.resources.snapshot(),
            "allocations": self.allocations,
        }
