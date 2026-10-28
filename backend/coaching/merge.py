from __future__ import annotations

from coaching.format import dedup_titles
from coaching.guardrails import apply_coaching_guardrails, apply_deterministic_guardrails


def _prioritize(suggestions: list, max_count: int) -> list:
    # Simple priority: grammar/spelling first, then coaching types
    priority_types = {"spelling", "grammar", "punctuation", "capitalization", "apostrophe", "homophone"}
    high = [s for s in suggestions if str(s.get("type") or "").lower() in priority_types]
    low = [s for s in suggestions if str(s.get("type") or "").lower() not in priority_types]
    return (high + low)[:max_count]


def merge_deterministic_and_coaching(
    deterministic: list,
    coaching: list,
    user_text: str = "",
    det_max: int = 80,
    coach_max: int = 30,
    total_max: int = 100,
) -> list:
    det = dedup_titles(deterministic or [])
    if det_max > 0 and len(det) > det_max:
        det = _prioritize(det, det_max)
    det = apply_deterministic_guardrails(det, user_text)

    coach = apply_coaching_guardrails(dedup_titles(coaching or []), user_text, max_count=coach_max)

    merged = dedup_titles([*det, *coach])
    if total_max > 0 and len(merged) > total_max:
        merged = _prioritize(merged, total_max)
    return merged
