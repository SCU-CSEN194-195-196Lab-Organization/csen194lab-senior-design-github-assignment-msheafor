from __future__ import annotations

from mechanics.pipeline import finalize_mechanics_suggestions, is_spellchecker_ready

PAUSED_DET_MAX = 80
TYPING_DET_MAX = 30


async def get_mechanics_suggestions(text: str, coach_mode: str, user_id: str) -> list[dict]:
    mode = "typing" if coach_mode == "typing" else "paused"
    cap = PAUSED_DET_MAX if mode == "paused" else TYPING_DET_MAX
    return finalize_mechanics_suggestions(text.strip()[:12000], mode, cap)


def mechanics_health() -> dict:
    return {"spellchecker": is_spellchecker_ready()}
