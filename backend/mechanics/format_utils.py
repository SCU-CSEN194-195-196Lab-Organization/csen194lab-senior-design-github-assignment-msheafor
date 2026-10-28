from __future__ import annotations


def dedup_suggestion_titles(items: list[dict]) -> list[dict]:
    if not isinstance(items, list):
        return []
    seen: set[str] = set()
    out = []
    for s in items:
        key = str(s.get("title") or "").strip().lower()
        if not key:
            out.append(s)
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
    return out


def suggestions_to_feedback(suggestions: list[dict]) -> str:
    if not suggestions:
        return (
            "No suggestions on this pass—try a slightly longer excerpt, "
            "or your draft reads clean for spelling and quick clarity checks."
        )
    parts = []
    for i, s in enumerate(suggestions, 1):
        title = str(s.get("title") or "Note").strip()
        body = str(s.get("body") or "").strip()
        me = s.get("micro_edit")
        suffix = f"\nTry: {me}" if me and str(me).strip() else ""
        parts.append(f"{i}. {title}\n{body}{suffix}")
    return "\n\n".join(parts)
