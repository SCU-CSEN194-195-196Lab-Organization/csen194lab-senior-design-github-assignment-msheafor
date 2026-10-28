from __future__ import annotations


def dedup_titles(suggestions: list) -> list:
    seen: set[str] = set()
    out = []
    for s in (suggestions or []):
        key = str(s.get("title") or "").strip().lower()
        if not key:
            out.append(s)
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
    return out


def suggestions_to_feedback(suggestions: list) -> str:
    lst = suggestions or []
    if not lst:
        return "No suggestions on this pass—try a slightly longer excerpt, or your draft reads clean for spelling and quick clarity checks."
    lines = []
    for i, s in enumerate(lst, 1):
        title = str(s.get("title") or "Note").strip()
        body = str(s.get("body") or "").strip()
        micro = s.get("micro_edit")
        me_line = f"\nTry: {micro}" if micro and str(micro).strip() else ""
        lines.append(f"{i}. {title}\n{body}{me_line}")
    return "\n\n".join(lines)
