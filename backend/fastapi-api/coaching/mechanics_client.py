from __future__ import annotations

import logging
import os

import httpx

log = logging.getLogger(__name__)

_TIMEOUT_S = 30.0


def _mechanics_url() -> str:
    base = os.environ.get("MECHANICS_API_URL", "http://127.0.0.1:8787").rstrip("/")
    return f"{base}/mechanics"


def _secret() -> str:
    return os.environ.get("COACHING_INTERNAL_SECRET", "").strip()


async def get_mechanics_suggestions(text: str, coach_mode: str, user_id: str) -> list[dict]:
    secret = _secret()
    if not secret:
        log.warning("COACHING_INTERNAL_SECRET not set — mechanics call skipped")
        return []
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_S) as client:
            resp = await client.post(
                _mechanics_url(),
                headers={"X-Coaching-Internal-Secret": secret, "Content-Type": "application/json"},
                json={"text": text, "coachMode": coach_mode, "userId": user_id},
            )
        resp.raise_for_status()
        data = resp.json()
        suggestions = data.get("suggestions")
        return suggestions if isinstance(suggestions, list) else []
    except Exception as exc:
        log.error("Mechanics service error: %s", exc)
        return []
