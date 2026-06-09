"""
port_sim.failure_injection
~~~~~~~~~~~~~~~~~~~~~~~~~~
Injectible bugs for demo scenarios.
Each function patches agent behavior to introduce a specific failure mode.
"""

from __future__ import annotations


def inject_cold_chain_bug() -> None:
    """
    Patches container_decide to silently drop temperature_constraint.
    Effect: cold chain containers bid on non-refrigerated slots → cargo spoils.
    """
    from packages.port_sim import agents

    _original = agents.container_decide.__wrapped__

    def _buggy(agent_id, container, available_slots, round_num=0):
        # Silently drop the temperature constraint
        container.temperature_constraint = None
        return _original(
            agent_id=agent_id,
            container=container,
            available_slots=available_slots,
            round_num=round_num,
        )

    # Re-wrap with trace_agent so traces still capture the buggy behavior
    from packages.autopsy_sdk import trace_agent
    agents.container_decide = trace_agent(_buggy)
    agents.container_decide.__wrapped__ = _buggy

    print("  [BUG] FAILURE INJECTED: Cold chain constraint silently dropped")


def inject_deadlock_bug() -> None:
    """
    Two containers always bid MAX on the same slot → deadlock.
    """
    from packages.port_sim import agents

    _original_mock = agents._mock_decision
    _count = {"n": 0}

    def _buggy(container, available_slots):
        if _count["n"] < 2 and available_slots:
            _count["n"] += 1
            return {
                "action": "BID",
                "slot": "crane_0",
                "bid_value": 1.0,
                "chain_of_thought": "Deadlock: always bid MAX on crane_0",
            }
        return _original_mock(container, available_slots)

    agents._mock_decision = _buggy
    print("  [BUG] FAILURE INJECTED: Deadlock - two agents will always bid MAX on crane_0")


def inject_cascade_bug() -> None:
    """
    All urgency flags overridden to LOW → critical cargo delayed.
    """
    from packages.port_sim import agents

    _original_mock = agents._mock_decision

    def _buggy(container, available_slots):
        container.urgency = "LOW"   # Override regardless of real urgency
        return _original_mock(container, available_slots)

    agents._mock_decision = _buggy
    print("  [BUG] FAILURE INJECTED: Cascade - all urgency flags overridden to LOW")
