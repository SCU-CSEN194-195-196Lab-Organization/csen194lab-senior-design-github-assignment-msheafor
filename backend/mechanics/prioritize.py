from __future__ import annotations

_PRIORITY: dict[str, int] = {
    "spelling": 1,
    "apostrophe": 2,
    "homophone": 3,
    "spacing": 4,
    "capitalization": 5,
    "punctuation": 6,
    "grammar": 7,
    "coherence": 8,
    "style": 9,
    "repetition": 10,
    "stretched_word": 11,
}


def prioritize_suggestions(suggestions: list[dict], max_count: int) -> list[dict]:
    lst = list(suggestions) if isinstance(suggestions, list) else []
    n = max(0, int(max_count or 0))
    if not n or len(lst) <= n:
        return lst

    def score(s: dict) -> tuple:
        issue_type = str(s.get("issueType") or "").lower()
        return (_PRIORITY.get(issue_type, 7), -(s.get("confidence") or 0))

    return sorted(lst, key=score)[:n]
