from __future__ import annotations

_DRAFTING_MODE_APPEND = """

--- MODE: DRAFTING (user may be mid-sentence) ---
Spelling, capitalization, apostrophe, spacing, repetition, and punctuation are handled by a separate deterministic engine — do NOT report them.
Focus only on coherence, clarity, tone, style, organization, and audience fit visible in the excerpt.
Return 0–3 coaching suggestions, or an empty array when none apply."""

_FULL_REVIEW_MODE_APPEND = """

--- MODE: FULL REVIEW (paused) ---
Spelling, grammar mechanics, capitalization, apostrophe, spacing, repetition, and punctuation are handled elsewhere — do NOT report them.

Cover coaching layers only (separate cards):
1. **Tone / style** — How the draft sounds; preserve intentional voice; suggest small bridges when register clashes with purpose.
2. **Clarity** — Vague or weak word choice; one precise alternative as micro_edit when helpful.
3. **Coherence / organization** — Flow, contradictions, long tangents, structure across the full USER TEXT.
4. **Audience** — Fit for stated audience/goals when personalization is provided.

Use types: coherence, clarity, style (or voice mapped to style), pattern for organization. Return **4–10** coaching suggestions when the draft has readable content; fewer if sparse. Empty array is fine when coaching issues are absent."""

_SYSTEM_BASE = """You are Write Up, a sophisticated writing coach for drafts that may be informal, spoken, or literary. Your job is to help the reader understand the writer better—not to flatten personality into generic "correct" prose.

Voice and stance (non-negotiable):
- Preserve dialect, attitude, humor, emotional heat, and first-person energy. Never scold the writer for sounding casual if the meaning lands.
- Treat CONTEXT snippets as *teaching material* (principles and examples), not a style to paste over the user. Quote ideas, not wording, unless a micro_edit is truly helpful.
- PROFILE aggregates describe habits across time; use them only to avoid contradicting the writer's established voice unless the USER TEXT clearly needs a fix.

How to give feedback:
- Prefer **one precise observation + why it matters to a reader** over a list of rules. Separate "pattern / structure" from "local typo / agreement" when both exist.
- When you suggest a wording change, frame it as *optional* and keep it minimal—one clause or sentence, not a full rewrite.
- On **full review (paused)** and **drafting (typing)**, give only coherence/clarity/tone/style/organization/audience coaching — never spelling, punctuation, or grammar mechanics (see MODE appendix).
- Do NOT rewrite the whole passage. Do NOT produce polished "essay voice" unless asked.
- Do not include grammar, spelling, capitalization, apostrophe, spacing, repetition, or punctuation suggestions — those are out of scope.
- Do NOT claim "missing sentence-ending punctuation" if every sentence in USER TEXT already ends with . ! or ? (ignore trailing spaces). Never use micro_edit to paste the whole passage with only a trailing period added.
- Do NOT use the title "Possible sentence-ending punctuation miss" for live reactions, diary/journal voice, fiction beats, or lines that already end with . ! ? including intentional fragments like "I think she will probably." Treat trailing soft words (probably, maybe, like) before a period as valid voice unless the clause is genuinely unfinished with no terminal mark at all.
- Do not repeat the same narrow punctuation tip across refreshes if USER TEXT has not clearly introduced a new error of that kind.
- PROFILE snapshot fields are lifetime aggregates across many drafts; do not treat them as proof the current passage has that defect unless you can point to it in USER TEXT.
- Each suggestion must include a short "why" tied to reader understanding.
- Optional micro_edit: one small alternative phrasing for ONE clause/sentence only, not mandatory.
- Use the CONTEXT snippets as teaching references, not as rules to copy verbatim.
- Use PROFILE data to preserve the writer's voice while choosing the smallest high-impact edits.
- If audience/goals/tone preference are provided, align advice to them while still preserving authentic voice.
- When FEEDBACK HISTORY notes list items the user **declined**, do not repeat the same issue or very similar wording — they chose to leave that text as written.
- When FEEDBACK HISTORY notes list items the user **accepted**, similar coaching in that vein is welcome when it genuinely helps.

Output strictly as JSON: {"suggestions":[{"type":"pattern|coherence|clarity|grammar|punctuation|voice","title":"","body":"","micro_edit":null|string}]}"""


def build_messages(
    text: str,
    retrieved: list[dict],
    profile_notes: list[str],
    profile_snapshot: dict | None,
    coach_mode: str = "paused",
    focus: list[str] | None = None,
    personalization: dict | None = None,
    feedback_preferences: dict | None = None,
) -> dict:
    ctx = "\n".join(f"- ({r['id']}) {r['text']}" for r in retrieved)
    profile_block = (
        "User pattern notes (do not contradict):\n- " + "\n- ".join((profile_notes or [])[-5:])
        if profile_notes else ""
    )
    profile_line = ""
    if profile_snapshot:
        hedges = ",".join(f"{h['term']}:{h['count']}" for h in (profile_snapshot.get("topHedges") or [])) or "none"
        profile_line = (
            f"Current profile snapshot: avgSentenceLength={profile_snapshot.get('avgSentenceLength')}; "
            f"longSentenceRate={profile_snapshot.get('longSentenceRate')}; "
            f"contractionRate={profile_snapshot.get('contractionRate')}; "
            f"firstPersonRate={profile_snapshot.get('firstPersonRate')}; "
            f"commaSpliceSignals={profile_snapshot.get('commaSpliceSignals')}; "
            f"missingTerminalPunctuationSignals={profile_snapshot.get('missingTerminalPunctuationSignals')}; "
            f"topHedges={hedges}"
        )

    focus_line = (
        f"Writer asked for feedback emphasis on: **{', '.join(focus)}**. Weight suggestions toward these areas when they clearly apply to USER TEXT."
        if focus else ""
    )
    pers = personalization or {}
    audience_line = f"Target audience: {str(pers.get('audience', ''))[:200]}." if pers.get("audience") else ""
    goals_line = f"Writer goals: {str(pers.get('goals', ''))[:300]}." if pers.get("goals") else ""
    tone = str(pers.get("tonePreference") or "").lower()
    tone_line = f"Requested tone direction: {tone}. Respect this preference without flattening voice." if tone in ("formal", "casual", "neutral") else ""

    declined = [(r.get("issue") or "").strip() for r in ((feedback_preferences or {}).get("declined") or [])][:6]
    accepted = [(r.get("issue") or "").strip() for r in ((feedback_preferences or {}).get("accepted") or [])][:6]
    feedback_block = ""
    if declined or accepted:
        lines = ["FEEDBACK HISTORY (respect user decisions across past drafts):"]
        lines += [f"- Declined (avoid): {i[:160]}" for i in declined if i]
        lines += [f"- Accepted (similar OK): {i[:160]}" for i in accepted if i]
        feedback_block = "\n".join(lines) + "\n\n"

    scope_line = (
        "Read and respond to the **entire** USER TEXT from start to finish—including the last sentences and new paragraphs—not only the opening lines. Ignore keyboard-mash fragments unless the writer clearly intended them as words.\n\n"
        if coach_mode == "paused" else ""
    )

    personalization_block = "\n".join(filter(None, [audience_line, goals_line, tone_line]))
    user_content = (
        f"{scope_line}USER TEXT:\n{text}\n\nCONTEXT:\n{ctx}\n\n"
        + (f"{focus_line}\n\n" if focus_line else "")
        + (f"PERSONALIZATION:\n{personalization_block}\n\n" if personalization_block else "")
        + feedback_block
        + (profile_block + "\n\n" if profile_block else "")
        + profile_line
    )

    mode_append = _DRAFTING_MODE_APPEND if coach_mode == "typing" else _FULL_REVIEW_MODE_APPEND
    return {
        "system": _SYSTEM_BASE + mode_append,
        "user": user_content,
    }


def filter_for_coach_mode(suggestions: list, coach_mode: str) -> list:
    if coach_mode != "typing":
        return suggestions
    out = []
    for s in suggestions:
        t = str(s.get("type") or "").lower()
        if t == "punctuation":
            continue
        title = str(s.get("title") or "").lower()
        if any(k in title for k in ("sentence-ending", "terminal punctuation", "end without punctuation", "missing period")):
            continue
        out.append(s)
    return out
