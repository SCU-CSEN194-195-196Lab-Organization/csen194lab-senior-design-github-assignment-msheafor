from __future__ import annotations

import json
import logging
import os

import httpx

from llm.prompts import build_messages, filter_for_coach_mode

log = logging.getLogger(__name__)

_GROQ_BASE = "https://api.groq.com/openai/v1"
_GROQ_MODEL = "llama-3.3-70b-versatile"
_OPENAI_BASE = "https://api.openai.com/v1"
_OPENAI_MODEL = "gpt-4o-mini"
_LLM_TIMEOUT_S = 8.0


def resolve_llm_attempts() -> list[dict]:
    attempts = []
    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if groq_key:
        attempts.append({"id": "groq", "label": "Groq", "api_key": groq_key, "base_url": _GROQ_BASE, "model": _GROQ_MODEL})
    if openai_key:
        attempts.append({"id": "openai", "label": "OpenAI", "api_key": openai_key, "base_url": _OPENAI_BASE, "model": _OPENAI_MODEL})
    return attempts


async def coach_with_llm(
    text: str,
    retrieved: list[dict],
    profile_notes: list[str],
    profile_snapshot: dict | None,
    cfg: dict,
    coach_mode: str = "paused",
    focus: list[str] | None = None,
    personalization: dict | None = None,
    feedback_preferences: dict | None = None,
) -> list[dict]:
    messages = build_messages(
        text=text,
        retrieved=retrieved,
        profile_notes=profile_notes,
        profile_snapshot=profile_snapshot,
        coach_mode=coach_mode,
        focus=focus,
        personalization=personalization,
        feedback_preferences=feedback_preferences,
    )
    temperature = 0.22 if coach_mode == "typing" else 0.35
    url = cfg["base_url"].rstrip("/") + "/chat/completions"

    async with httpx.AsyncClient(timeout=_LLM_TIMEOUT_S) as client:
        resp = await client.post(
            url,
            headers={"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"},
            json={
                "model": cfg["model"],
                "temperature": temperature,
                "messages": [
                    {"role": "system", "content": messages["system"]},
                    {"role": "user", "content": messages["user"]},
                ],
            },
        )

    if resp.status_code != 200:
        raise RuntimeError(f"{cfg['label']} error {resp.status_code}: {resp.text[:400]}")

    data = resp.json()
    raw = data.get("choices", [{}])[0].get("message", {}).get("content") or "{}"
    json_match = next(iter(__import__("re").findall(r"\{[\s\S]*\}", raw)), raw)
    parsed = json.loads(json_match)
    raw_list = parsed.get("suggestions") if isinstance(parsed.get("suggestions"), list) else []
    return filter_for_coach_mode(raw_list, coach_mode)
