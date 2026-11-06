"""Hint bank for the /game/hint route.

One hint per grammar type for now. Later, pick_hint can be swapped for an
AI lookup (RAG over game-hint content) without changing the route.
The comma hint is Catherine's BLUE_HINT from dialogueScreen.ts.
"""

from __future__ import annotations

# Which grammar skill each case teaches.
CASE_GRAMMAR: dict[int, str] = {
    1: "commas",       # Case 1: bakery thefts
    2: "apostrophes",  # Case 2: library
}

HINTS: dict[str, str] = {
    "commas": "You currently have a comma missing from a sentence that needs it. Try looking for words like “for,” “and,” “nor,” “but,” “or,” and “therefore,” and check if they separate two ideas that work as complete sentences on their own. Also check for lists of items or actions, and see if each item is separated by a comma.",
    "apostrophes": "An apostrophe shows that something belongs to someone: “the librarian's key.” A plain plural, like “books,” doesn't need one.",
}

# AI to be plugged-in here
def pick_hint(case_number: int) -> tuple[str, str] | None:
    """Return (grammar_type, hint_text) for a case, or None if unknown."""
    grammar_type = CASE_GRAMMAR.get(case_number)
    if grammar_type is None:
        return None
    return grammar_type, HINTS[grammar_type]