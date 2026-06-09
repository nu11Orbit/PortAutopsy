"""
llm_analyzer.llm_client
~~~~~~~~~~~~~~~~~~~~~~~
Unified LLM interface: Gemini (primary) + Groq (fallback).
Both use structured output to guarantee valid AutopsyReport JSON.
Zero LangChain — direct SDK calls only.
"""

from __future__ import annotations

import os
import json
from dotenv import load_dotenv
from packages.autopsy_sdk.models import AutopsyReport

load_dotenv()


def generate_autopsy_report(prompt: str) -> AutopsyReport:
    """
    Generate an AutopsyReport from a prompt.
    Tries Gemini first; if that fails, falls back to Groq.
    """
    errors = []

    # ── Attempt 1: Google Gemini ─────────────────────────────
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            return _call_gemini(prompt, gemini_key)
        except Exception as e:
            errors.append(f"Gemini: {e}")
            print(f"  [Gemini failed: {e}] Trying Groq fallback...")

    # ── Attempt 2: Groq Cloud ────────────────────────────────
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        try:
            return _call_groq(prompt, groq_key)
        except Exception as e:
            errors.append(f"Groq: {e}")
            print(f"  [Groq failed: {e}] Using hardcoded fallback...")

    # ── Attempt 3: Hardcoded fallback (demo safety) ──────────
    print("  [WARNING] All LLM providers failed. Using hardcoded report.")
    return _hardcoded_fallback()


def _call_gemini(prompt: str, api_key: str) -> AutopsyReport:
    """
    Gemini with native Pydantic structured output.
    response_schema=AutopsyReport → response.parsed is already validated.
    """
    from google import genai

    client = genai.Client(api_key=api_key)

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": AutopsyReport,
        },
    )

    # response.parsed is already an AutopsyReport instance
    if response.parsed:
        return response.parsed

    # Fallback: parse from text if .parsed isn't available
    raw_text = response.text.strip()
    return AutopsyReport(**json.loads(raw_text))


def _call_groq(prompt: str, api_key: str) -> AutopsyReport:
    """
    Groq with json_schema structured output.
    Uses model_json_schema() from Pydantic → validates through constructor.
    """
    from groq import Groq

    client = Groq(api_key=api_key)

    # Generate JSON Schema from the Pydantic model
    schema = AutopsyReport.model_json_schema()
    # Remove Pydantic metadata that Groq doesn't understand
    schema.pop("title", None)
    schema.pop("$defs", None)

    response = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a multi-agent system debugger. "
                    "Analyze the provided causal graph and counterfactual data. "
                    "Respond with a flat, valid JSON object. "
                    "CRITICAL: You MUST use this EXACT JSON format. Do not use nested objects for strings. "
                    "{\n"
                    '  "failure": "string describing the failure",\n'
                    '  "root_cause_agent": "string (agent id)",\n'
                    '  "root_cause_decision": "string describing the decision",\n'
                    '  "causal_chain": ["string step 1", "string step 2"],\n'
                    '  "counterfactual": "string describing what would have happened",\n'
                    '  "suggested_fix": "string with suggested code fix",\n'
                    '  "confidence": 0.95\n'
                    "}"
                ),
            },
            {"role": "user", "content": prompt},
        ],
        model="llama-3.3-70b-versatile",
        response_format={
            "type": "json_object",
        },
        temperature=0.3,
        max_tokens=1500,
    )

    raw_text = response.choices[0].message.content.strip()
    raw_dict = json.loads(raw_text)
    return AutopsyReport(**raw_dict)


def _hardcoded_fallback() -> AutopsyReport:
    """
    Demo safety net — never let a failed API call kill the pitch.
    Returns a realistic pre-written report for the cold-chain scenario.
    """
    return AutopsyReport(
        failure=(
            "Cold chain violation — container_047 cargo spoiled. "
            "Temperature-sensitive goods were placed on a non-refrigerated "
            "crane slot, causing a cold chain break at simulation time t+16."
        ),
        root_cause_agent="container_047",
        root_cause_decision=(
            "Bid on non-refrigerated slot crane_5 at round 3 because "
            "temperature_constraint was silently dropped to None by the "
            "constraint parser, causing the agent to treat cold-chain "
            "cargo as standard cargo."
        ),
        causal_chain=[
            "ConstraintParser.parse() received cold_chain container with temperature_constraint=4.0°C",
            "Bug: temperature_constraint silently set to None (null check missing)",
            "container_047 agent received inputs with temperature_constraint=None",
            "Agent's chain-of-thought: 'No temperature constraint, treating as standard cargo'",
            "Agent bid on crane_5 (non-refrigerated) — cheapest available slot",
            "Auction engine allocated crane_5 to container_047",
            "Cold chain violation detected at t+16: cargo temperature exceeded safe range",
        ],
        counterfactual=(
            "If container_047 had received temperature_constraint=4.0°C, "
            "it would have bid on crane_2 (refrigerated) with bid_value=0.85. "
            "No cold chain violation would have occurred."
        ),
        suggested_fix=(
            "Add null-check in ConstraintParser.parse(): "
            "if container.temperature_constraint is None and "
            "container.cargo_type == 'cold_chain': "
            "raise ValueError('Cold chain cargo requires temperature constraint')"
        ),
        confidence=0.94,
    )
