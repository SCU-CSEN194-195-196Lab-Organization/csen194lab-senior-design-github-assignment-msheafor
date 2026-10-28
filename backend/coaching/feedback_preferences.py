from __future__ import annotations

import re

_CURLY_QUOTES = str.maketrans({"“": "", "”": "", "‘": "", "’": ""})


def _normalize_issue(issue: str) -> str:
    return re.sub(r"\s+", " ", str(issue or "").lower().translate(_CURLY_QUOTES).replace('"', "").replace("'", "")).strip()


def _kind_key(issue: str) -> str:
    normalized = _normalize_issue(issue)
    m = re.match(r"^([a-z][a-z\s/\-]{0,40}):", normalized)
    return m.group(1).strip() if m else ""


def _suggestion_category(s: dict) -> str:
    return str(s.get("issueType") or s.get("type") or s.get("category") or "coaching").lower()


def build_preference_model(preferences: dict | None) -> dict:
    declined_issues: set[str] = set()
    accepted_issues: set[str] = set()
    declined_kinds: set[str] = set()
    accepted_kinds: set[str] = set()

    for row in (preferences or {}).get("declined") or []:
        key = _normalize_issue(row.get("issue") or "")
        if key:
            declined_issues.add(key)
        kind = _kind_key(row.get("issue") or "")
        if kind:
            declined_kinds.add(kind)

    for row in (preferences or {}).get("accepted") or []:
        key = _normalize_issue(row.get("issue") or "")
        if key:
            accepted_issues.add(key)
        kind = _kind_key(row.get("issue") or "")
        if kind:
            accepted_kinds.add(kind)

    return {
        "declinedIssues": declined_issues,
        "acceptedIssues": accepted_issues,
        "declinedKinds": declined_kinds,
        "acceptedKinds": accepted_kinds,
        "categoryScores": (preferences or {}).get("categoryScores") or {},
    }


def _should_suppress(s: dict, model: dict) -> bool:
    title_key = _normalize_issue(s.get("title") or "")
    if title_key and title_key in model["declinedIssues"] and title_key not in model["acceptedIssues"]:
        return True
    kind = _kind_key(s.get("title") or "")
    if kind and kind in model["declinedKinds"] and kind not in model["acceptedKinds"]:
        cat = _suggestion_category(s)
        scores = model["categoryScores"].get(cat) or {}
        if int(scores.get("declined") or 0) >= 2 and int(scores.get("accepted") or 0) == 0:
            return True
    return False


def _rank_score(s: dict, model: dict) -> int:
    score = 0
    title_key = _normalize_issue(s.get("title") or "")
    kind = _kind_key(s.get("title") or "")
    cat = _suggestion_category(s)
    scores = model["categoryScores"].get(cat) or {}
    accepted = int(scores.get("accepted") or 0)
    declined = int(scores.get("declined") or 0)

    if title_key and title_key in model["acceptedIssues"]:
        score += 4
    if kind and kind in model["acceptedKinds"]:
        score += 2
    if accepted >= 2:
        score += 2
    elif accepted > declined:
        score += 1
    if declined >= 2 and accepted == 0:
        score -= 3
    elif declined > accepted:
        score -= 1
    if title_key and title_key in model["declinedIssues"]:
        score -= 5
    if kind and kind in model["declinedKinds"]:
        score -= 1
    return score


def apply_feedback_preferences(suggestions: list, preferences: dict | None) -> list:
    lst = suggestions or []
    has_history = (
        len((preferences or {}).get("accepted") or []) > 0
        or len((preferences or {}).get("declined") or []) > 0
        or len((preferences or {}).get("categoryScores") or {}) > 0
    )
    if not has_history:
        return lst
    model = build_preference_model(preferences)
    filtered = [s for s in lst if not _should_suppress(s, model)]
    return sorted(filtered, key=lambda s: (_rank_score(s, model), s.get("confidence") or 0), reverse=True)


def feedback_preference_notes(preferences: dict | None) -> list[str]:
    notes = []
    for row in ((preferences or {}).get("declined") or [])[:8]:
        issue = str(row.get("issue") or "").strip()
        if issue:
            notes.append(f"User declined (avoid repeating): {issue[:180]}")
    for row in ((preferences or {}).get("accepted") or [])[:8]:
        issue = str(row.get("issue") or "").strip()
        if issue:
            notes.append(f"User accepted (similar coaching welcome): {issue[:180]}")
    return notes
