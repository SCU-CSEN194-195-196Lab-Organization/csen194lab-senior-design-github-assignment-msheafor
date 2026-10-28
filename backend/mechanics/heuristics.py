from __future__ import annotations
import logging
import os
import re

from .issue_types import CONFIDENCE_MIN, make_card
from .nlp import HEDGE_WORDS, count_matches, tokenize
from .word_quality import is_likely_gibberish_token
from .mechanics_detect import is_serial_noun_list

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Spellchecker (pyspellchecker — Hunspell-based, same approach as nspell)
# ---------------------------------------------------------------------------

try:
    from spellchecker import SpellChecker as _SpellChecker
    _spell = _SpellChecker()
except Exception as _e:
    log.warning("Spellchecker unavailable: %s", _e)
    _spell = None


def is_spellchecker_ready() -> bool:
    return _spell is not None


# ---------------------------------------------------------------------------
# Seed tables
# ---------------------------------------------------------------------------

SPELLING_OVERRIDES = [
    (re.compile(r"\bpregnate\b", re.I), "pregnant", None),
    (re.compile(r"\bbrib(?:es|ed|ing)?\b", re.I), "bribe", "verb/noun for offering money improperly"),
    (re.compile(r"\brecieve\b", re.I), "receive", "i before e except after c"),
    (re.compile(r"\bwierd\b", re.I), "weird", "i before e rule"),
    (re.compile(r"\bdefinately\b", re.I), "definitely", None),
    (re.compile(r"\brecieved\b", re.I), "received", None),
]

_COMMON_PROPER_LOWERCASE = set(
    "sarah chicago paris london michael canada microsoft apple google amazon boston seattle "
    "toronto vancouver denver atlanta dallas houston phoenix detroit minneapolis portland "
    "john mary david james robert jennifer amanda alexander benjamin christopher elizabeth "
    "acme york california texas florida virginia colorado".split()
)

_FUSED_SPACING_PATTERNS = [
    (re.compile(r"\bcompanyis\b", re.I), "company is"),
    (re.compile(r"\bprojectis\b", re.I), "project is"),
    (re.compile(r"\bsendthe\b", re.I), "send the"),
    (re.compile(r"\bmeetafter\b", re.I), "meet after"),
    (re.compile(r"\breportthe\b", re.I), "report the"),
    (re.compile(r"\bemailthe\b", re.I), "email the"),
]

# (pattern, issue_type, title, body, micro_edit)
PHRASE_RULES: list[tuple] = [
    (
        re.compile(r"\btheir\s+(?:is|are|was|were|have|has|had|will|would|could|should|may|might|must|been|no\b)", re.I),
        "grammar", "Word confusion: “their” vs “there”",
        "**Their** shows possession (belonging to them). **There** points to a place or introduces a clause. Use **there** here.",
        None,
    ),
    (re.compile(r"\bshould\s+of\b", re.I), "grammar", "Grammar: “should of”",
     "This sounds like a contraction but the correct form is **should have** (or *should’ve*).", "should have"),
    (re.compile(r"\bcould\s+of\b", re.I), "grammar", "Grammar: “could of”",
     "The correct form is **could have** (or *could’ve*).", "could have"),
    (re.compile(r"\bwould\s+of\b", re.I), "grammar", "Grammar: “would of”",
     "The correct form is **would have** (or *would’ve*).", "would have"),
    (re.compile(r"\byour\s+welcome\b", re.I), "grammar", "Phrase: “your welcome”",
     "Use the contraction **you're** (*you are welcome*) rather than the possessive **your**.", "You're welcome"),
    (re.compile(r"\bthere\s+is\s+(?:so\s+)?many\b", re.I), "grammar", "Subject–verb agreement",
     "**Many** is plural, so standard English uses **there are** (not *there is*).", None),
    (re.compile(r"\b(?:they|we|you)\s+(?:was|is)\b", re.I), "grammar",
     "Subject–verb agreement: plural pronoun with singular verb",
     "**They**, **we**, and **you** take plural verbs: **were** (past) or **are** (present).", None),
    (re.compile(r"\b(?:it|he|she|everyone|someone|anyone|nobody|nothing|everything)\s+are\b", re.I),
     "grammar", "Subject–verb agreement: singular subject with “are”",
     "This subject is singular—use **is** instead of **are**.", None),
    (re.compile(r"\b(?:this|that)\s+(?:\w+\s+)?are\b", re.I), "grammar",
     "Subject–verb agreement: singular subject with “are”",
     "**This** and **that** are singular determiners—use **is** instead of **are**.", None),
    (re.compile(r"\b(?:[a-z]+nts|[a-z]+nds|[a-z]+cts|[a-z]+rds|[a-z]+lts)\s+was\b", re.I),
     "grammar", "Subject–verb agreement: plural subject with “was”",
     "A plural subject takes **were**, not **was**. Try: the students *were* excited.", None),
    (re.compile(r"\bdont\b", re.I), "grammar", "Missing apostrophe: “dont”",
     "Standard contraction is **don’t** (*do not*).", "don't"),
    (re.compile(r"\bdidnt\b", re.I), "grammar", "Missing apostrophe: “didnt”",
     "Standard contraction is **didn’t** (*did not*).", "didn't"),
    (re.compile(r"\bisnt\b", re.I), "grammar", "Missing apostrophe: “isnt”",
     "Standard contraction is **isn’t** (*is not*).", "isn't"),
    (re.compile(r"\bwasnt\b", re.I), "grammar", "Missing apostrophe: “wasnt”",
     "Standard contraction is **wasn’t** (*was not*).", "wasn't"),
    (re.compile(r"\barent\b", re.I), "grammar", "Missing apostrophe: “arent”",
     "Standard contraction is **aren’t** (*are not*).", "aren't"),
    (re.compile(r"\bwerent\b", re.I), "grammar", "Missing apostrophe: “werent”",
     "Standard contraction is **weren’t** (*were not*).", "weren't"),
    (re.compile(r"\bhasnt\b", re.I), "grammar", "Missing apostrophe: “hasnt”",
     "Standard contraction is **hasn’t** (*has not*).", "hasn't"),
    (re.compile(r"\bhavent\b", re.I), "grammar", "Missing apostrophe: “havent”",
     "Standard contraction is **haven’t** (*have not*).", "haven't"),
    (re.compile(r"\bwouldnt\b", re.I), "grammar", "Missing apostrophe: “wouldnt”",
     "Standard contraction is **wouldn’t** (*would not*).", "wouldn't"),
    (re.compile(r"\bcouldnt\b", re.I), "grammar", "Missing apostrophe: “couldnt”",
     "Standard contraction is **couldn’t** (*could not*).", "couldn't"),
    (re.compile(r"\bshouldnt\b", re.I), "grammar", "Missing apostrophe: “shouldnt”",
     "Standard contraction is **shouldn’t** (*should not*).", "shouldn't"),
    (re.compile(r"\bdoesnt\b", re.I), "grammar", "Missing apostrophe: “doesnt”",
     "Standard contraction is **doesn’t** (*does not*).", "doesn't"),
    (re.compile(r"\bhadnt\b", re.I), "grammar", "Missing apostrophe: “hadnt”",
     "Standard contraction is **hadn’t** (*had not*).", "hadn't"),
    (re.compile(r"\bwont\b(?=\s+(?:be\b|have\b|do\b|let\b|stop\b|go\b|give\b|come\b|make\b|take\b|say\b))", re.I),
     "grammar", "Missing apostrophe: “wont”",
     "In this context the intended word is likely **won’t** (*will not*). (Note: “wont” without an apostrophe is a different word meaning “habitual custom.”)", "won't"),
    (re.compile(r"\bits\s+been\b", re.I), "grammar", "Apostrophe confusion: “its been”",
     "**Its** is the possessive pronoun (no apostrophe). **It’s** is the contraction of *it is* or *it has*. Here the contraction is needed: **it’s been**.", "it's been"),
    (re.compile(r"\bit's\s+own\b", re.I), "grammar", "Apostrophe confusion: “it’s own”",
     "**It’s** is a contraction (*it is* / *it has*). For possession, drop the apostrophe: **its own**.", "its own"),
    (re.compile(
        r"\b(?:changed|updated|modified|altered|replaced|revised|improved|increased|reduced|published|released|"
        r"launched|introduced|implemented|applied|maintained|enhanced|established|created|built|designed|developed|"
        r"removed|deleted|expanded|completed|controlled|managed|determined|influenced|structured|organized|formatted|"
        r"labeled|named|defined|combined|merged|split|converted|transformed)\s+it's\b", re.I),
     "grammar", "Apostrophe confusion: “it’s” as possessive",
     "**It’s** is a contraction (*it is* / *it has*). After a transitive verb like this, possession is intended—use **its** (no apostrophe).", None),
    (re.compile(r"\byour\s+going\b", re.I), "grammar", "Apostrophe confusion: “your going”",
     "**Your** is possessive (*your bag*). Here the contraction **you’re** (*you are*) is needed: **you’re going**.", "you're going"),
    (re.compile(r"\byour\s+being\b", re.I), "grammar", "Apostrophe confusion: “your being”",
     "**Your** is possessive; **you’re** (*you are*) is the contraction. Try: **you’re being**.", "you're being"),
    (re.compile(r"\byour\s+(?:probably|definitely|certainly|surely|clearly|obviously|right|wrong|late|early|ready|done|finished|supposed|crazy|lucky|kidding|joking)\b", re.I),
     "grammar", "Apostrophe confusion: “your” vs “you’re”",
     "**Your** shows possession (*your bag*). Before an adjective or adverb like this, the contraction **you’re** (*you are*) is almost always intended.", None),
    (re.compile(r"(?:^|[.!?\n]\s*)[Ww]ere\s+[a-z]+ing\b"),
     "grammar", "Word confusion: “were” at sentence start",
     "**Were** is the past tense of *to be* (e.g., *they were planning*). At the start of a sentence without an explicit subject, the likely intended word is the contraction **we’re** (*we are*).", None),
    (re.compile(r"\btheir\s+going\s+to\b", re.I), "grammar", "Homophone: “their going to”",
     "**Their** is a possessive pronoun (*their car*). In the phrase **their going to**, the intended word is the contraction **they’re** (*they are*): **they’re going to**.", "they're going to"),
]

TYPO_OVERRIDES = [
    (re.compile(r"\bteh\b", re.I), "the", "transposed letters"),
]

HEURISTIC_THRESHOLDS = {
    "LONG_SENTENCE_WORDS": 28,
    "HEDGE_REPEAT_MIN": 3,
    "OBVIOUS_MAX_CARDS": 48,
    "STRUCTURAL_MAX_CARDS": 40,
    "MAX_LOWERCASE_START_CARDS": 6,
    "MAX_STRETCHED_CARDS": 5,
}

TONE_SHIFT_RULES = [
    (
        re.compile(r"\b(shit|fuck(?:ing|ed|er)?|damn(?:it)?|crap|ass(?:hole)?|hell(?:uva)?|freaking|friggin|effing|wtf|bullshit|pissed|dumbass|bastard|bitch(?:ing)?|screw(?:ing|ed)?)\b", re.I),
        re.compile(r"\b(professional|vision|product|report|essay|thesis|professor|client|proposal|stakeholder|project|meeting|workplace|business|company|executive|management|corporate|enterprise|deadline|deliverable|strategy)\b", re.I),
        "Tone shift: casual language in a formal context",
        "Casual language can be honest voice—but next to formal topic words, readers may need one bridge sentence to confirm the register is intentional.",
    ),
]

_SPELL_ALLOW = set(
    "omg lol lmao rofl imo tbh idk btw fr frfr ngl irl ig u ur bc cos cuz tho thru pls plz ppl ok okay yep "
    "nah huh hmm hm er um uh kinda sorta gonna wanna gotta hell damn darn shoot dang heck yeet sus cap fax "
    "nope haha hahaha woah whoa yall ya'll gonna cv api css html js ts jpg png gif pdf url uri sql dns tcp "
    "http https www com org net io co uk app apps ios android bro holy shit fuck fucking freaking crap ass "
    "dude man guys gon na".split()
)

_ALWAYS_PROPER_LOWER = set(
    "monday tuesday wednesday thursday friday saturday sunday "
    "january february march april may june july august "
    "september october november december "
    "english french spanish german chinese japanese korean arabic "
    "russian italian portuguese dutch swedish norwegian danish finnish "
    "american european asian african latin british australian canadian "
    "christian muslim jewish buddhist hindu protestant catholic "
    "internet".split()
)

_FUSE_LEFT = set(
    "the send meet company project report account team file email with for from to in on at by".split()
)


def _phrase_rule_issue_type(title: str) -> str:
    if re.search(r"should of|could of|would of|your welcome|their\s|Homophone", title, re.I):
        return "homophone"
    if re.search(r"Apostrophe|its been|your going|your being", title, re.I):
        return "apostrophe"
    if re.search(r"Subject", title, re.I):
        return "grammar"
    if re.search(r"Word confusion", title, re.I):
        return "homophone"
    return "grammar"


def _phrase_rule_confidence(issue_type: str, title: str) -> float:
    if issue_type == "homophone":
        return 0.96
    if issue_type == "apostrophe":
        return 0.94
    if re.search(r"Subject", title, re.I):
        return 0.88
    return 0.84


def draft_has_heavy_unknown_tokens(text: str) -> bool:
    if not _spell:
        return False
    tokens = re.findall(r"\b[a-zA-Z]{4,}\b", str(text or ""))
    if len(tokens) < 4:
        return False
    unknown = 0
    for raw in tokens:
        lw = raw.lower()
        if lw in _SPELL_ALLOW:
            continue
        if len(lw) == 4:
            unknown += 1
            continue
        if is_likely_gibberish_token(raw) or not _spell.known([lw]):
            unknown += 1
    return unknown / len(tokens) >= 0.4


def spell_dictionary_suggestions(text: str, max_cards: int = 12) -> list[dict]:
    if not _spell:
        return []
    max_cards = max(1, min(40, int(max_cards or 12)))
    t = str(text)
    seen: set[str] = set()
    cards: list[dict] = []

    for pattern, fix, note in SPELLING_OVERRIDES:
        m = pattern.search(t)
        if not m:
            continue
        lw = m.group(0).lower()
        if lw in seen:
            continue
        seen.add(lw)
        note_str = f" ({note})" if note else ""
        cards.append(make_card("spelling", f"Spelling: “{m.group(0)}”",
                               f"Standard spelling is **{fix}**{note_str}.", fix, 0.97))
        if len(cards) >= max_cards:
            break

    for m in re.finditer(r"\b([a-zA-Z]{4,})\b", t):
        if len(cards) >= max_cards:
            break
        raw = m.group(1)
        lw = raw.lower()

        if lw in _SPELL_ALLOW or lw in seen:
            continue
        if is_likely_gibberish_token(raw):
            continue
        if re.match(r"^[A-Z]{2,}$", raw):
            continue

        if raw[0].isupper():
            if lw not in _ALWAYS_PROPER_LOWER and _spell.known([lw]):
                prev_text = t[:m.start()].rstrip()
                at_boundary = (
                    not prev_text
                    or bool(re.search(r'[.!?\n]["\'”’]?\s*$', prev_text))
                    or bool(re.search(r":\s*$", prev_text))
                )
                if not at_boundary:
                    seen.add(lw)
                    cards.append(make_card(
                        "capitalization", f"Capitalization: “{raw}”",
                        f"“{raw}” appears mid-sentence. Only proper nouns (names, places, titles) are capitalized in standard English. If this is a common word, use “{lw}” instead.",
                        lw,
                    ))
            continue

        if any(p.search(raw) for p, _, _ in SPELLING_OVERRIDES):
            continue

        if re.search(r"([a-z])\1{2}", lw, re.I):
            continue

        if _spell.known([lw]):
            continue

        capital_form = lw[0].upper() + lw[1:]

        if lw in _COMMON_PROPER_LOWERCASE:
            seen.add(lw)
            cards.append(make_card(
                "capitalization", f"Capitalization: “{raw}”",
                f"“{raw}” looks like a proper noun (a name or place). Capitalize it: **{capital_form}**.",
                capital_form, 0.95,
            ))
            continue

        candidates = _spell.candidates(lw) or set()
        sug_list = sorted(candidates, key=lambda w: _spell.word_usage_frequency(w), reverse=True)

        if capital_form in candidates:
            seen.add(lw)
            cards.append(make_card(
                "capitalization", f"Capitalization: “{raw}”",
                f"“{raw}” looks like a proper noun (a name or place). If so, capitalize it: **{capital_form}**.",
                capital_form,
            ))
            continue

        if len(lw) >= 5:
            split_card = None
            for cut in range(2, len(lw) - 1):
                left = lw[:cut]
                right = lw[cut:]
                if left not in _FUSE_LEFT:
                    continue
                if _spell.known([right]):
                    split_card = make_card(
                        "spacing", f"Missing space: “{raw}”",
                        f"This looks like two words fused together: **{left} {right}**. Add a space if that matches your meaning.",
                        f"{left} {right}",
                    )
                    break
            if split_card:
                seen.add(lw)
                cards.append(split_card)
                continue

        if not sug_list:
            seen.add(lw)
            cards.append(make_card(
                "spelling", f"Unrecognized word: “{raw}”",
                f"“{raw}” isn’t in the dictionary and no substitute was found. Double-check the spelling.",
                None,
            ))
            continue

        top_sug = sug_list[0]
        is_apostrophe_insertion = top_sug.replace("'", "") == lw

        if len(lw) == 4 and not is_apostrophe_insertion:
            continue
        if not is_apostrophe_insertion and all(s.lower() == lw for s in sug_list):
            continue

        seen.add(lw)
        if is_apostrophe_insertion:
            cards.append(make_card(
                "apostrophe", f"Missing apostrophe: “{raw}”",
                f"“{raw}” is missing an apostrophe. Standard form is **{top_sug}**.",
                top_sug, 0.96,
            ))
        else:
            second = f" or *{sug_list[1]}*" if len(sug_list) > 1 else ""
            cards.append(make_card(
                "spelling", f"Spelling: “{raw}”",
                f"Likely typo—dictionary suggests **{top_sug}**{second}. Pick the word that matches your meaning.",
                top_sug, 0.91,
            ))

    return cards


def obvious_spelling_grammar_heuristics(text: str) -> list[dict]:
    t = str(text or "")
    out: list[dict] = []

    def add(card: dict | None, confidence: float | None = None):
        if not card or not card.get("title"):
            return
        conf = confidence if confidence is not None else card.get("confidence", 0.9)
        if conf < CONFIDENCE_MIN:
            return
        out.append({**card, "confidence": conf})

    for pattern, issue_type, title, body, micro_edit in PHRASE_RULES:
        seen_phrase: set[str] = set()
        for m in pattern.finditer(t):
            key = m.group(0).lower()
            if key in seen_phrase:
                continue
            seen_phrase.add(key)
            quoted = re.search(r"[“\"]", title)
            if quoted:
                final_title = re.sub(r'[“"]([^”"]*)[”"]', f"“{m.group(0)}”", title)
            else:
                final_title = f"{title}: “{m.group(0)}”"
            itype = _phrase_rule_issue_type(title)
            conf = _phrase_rule_confidence(itype, title)
            add(make_card(itype, final_title, body, micro_edit, conf), conf)

    for pattern, fix, note in SPELLING_OVERRIDES:
        m = pattern.search(t)
        if m:
            note_str = f" ({note})" if note else ""
            add(make_card("spelling", f"Spelling: “{m.group(0)}”",
                          f"Standard spelling is **{fix}**{note_str}.", fix))

    for pattern, fix in _FUSED_SPACING_PATTERNS:
        for m in pattern.finditer(t):
            add(make_card("spacing", f"Missing space: “{m.group(0)}”",
                          f"Two words appear fused. Standard form: **{fix}**.", fix))

    for m in re.finditer(r"\b(dogs|cats)\s+(leash|collar|house|bed|bowl|food|toy|crate)\b", t, re.I):
        phrase = m.group(0)
        before = t[max(0, m.start() - 50):m.start()]
        plural_owner = bool(re.search(r"\b(?:their|our|both|those|these|several|many)\s+dogs\b", before + phrase, re.I)) or \
                       bool(re.search(r"\bdogs'\s+", t[m.start():m.start() + 20], re.I))
        owner = "dog" if m.group(1).lower() == "dogs" else "cat"
        fix = f"{m.group(1).lower()}' {m.group(2)}" if plural_owner else f"{owner}'s {m.group(2)}"
        add(make_card("apostrophe", f"Apostrophe: “{phrase}”",
                      f"Plural possession may fit here: **{fix}**." if plural_owner
                      else f"Use singular possessive **{owner}’s {m.group(2)}** (the leash belongs to one {owner}).",
                      fix, 0.92), 0.92)

    for m in re.finditer(r"\bcant\b", t, re.I):
        add(make_card("apostrophe", "Missing apostrophe: “cant”",
                      "Standard contraction is **can’t** (*cannot*).", "can't"))

    for m in re.finditer(r"\b(mis|non|pre|re|un|up)\s+(configured|dated|placed|paid|profit|stop|treated|known)\b", t, re.I):
        add(make_card("spacing", f"Compound word: “{m.group(0)}”",
                      f"These words are usually written as one word or with a hyphen: **{m.group(1)}-{m.group(2)}** or **{m.group(1)}{m.group(2)}**.",
                      f"{m.group(1)}-{m.group(2)}"))

    for m in re.finditer(r"\b([a-z]{3,})\s+([a-z]{3,})\s+([a-z]{3,})\s+and\s+([a-z]{3,})\b", t, re.I):
        if not is_serial_noun_list(m.group(0)):
            continue
        add(make_card("punctuation", f"Missing commas in list: “{m.group(0)}”",
                      f"Items in a list usually need commas: *{m.group(1)}, {m.group(2)}, {m.group(3)}, and {m.group(4)}*.",
                      None, 0.88), 0.88)

    for m in re.finditer(
        r"\bwent\s+(?:the\s+)?(?:store|market|grocery|mall|hospital|clinic|pharmacy|gym|office|school|class|library|museum|theater|theatre|restaurant|cafe|bank|shop|church|temple|salon|courthouse|airport|station)\b",
        t, re.I
    ):
        add(make_card("grammar", f"Missing preposition: “{m.group(0).strip()}”",
                      "A preposition is likely missing between **went** and the destination. Standard form: **went to [the] [place]**.",
                      None, 0.75), 0.75)

    for m in re.finditer(r"\b(I|he|she|we|they|you)\s+([a-z]{4,}ing)\b", t, re.I):
        phrase = f"{m.group(1)} {m.group(2)}"
        add(make_card("grammar", f"Missing auxiliary verb: “{phrase}”",
                      f"A verb like **is**, **are**, **was**, or **were** may be missing between **{m.group(1)}** and **{m.group(2)}**. Example: *{m.group(1)} is {m.group(2)}*.",
                      None, 0.72), 0.72)

    for m in re.finditer(r"\bneeds\s+([a-z]+(?:ed|en))\b", t, re.I):
        phrase = f"needs {m.group(1)}"
        add({"issueType": "grammar", "type": "grammar", "title": f"Missing words: “{phrase}”",
             "body": f"**Needs** followed directly by a past participle is non-standard. The usual form is **needs to be {m.group(1)}**.",
             "micro_edit": f"needs to be {m.group(1)}", "confidence": 0.9})

    for m in re.finditer(
        r"\b(arrived|came|got|left|started|ended|finished|completed|returned|appeared|ran|drove|flew|woke|landed)\s+(than)\b",
        t, re.I
    ):
        phrase = f"{m.group(1)} {m.group(2)}"
        add({"issueType": "grammar", "type": "grammar", "title": f"Missing comparative word: “{phrase}”",
             "body": f"A comparative word (*earlier*, *later*, *sooner*, *faster*, *slower*, etc.) appears to be missing between **{m.group(1)}** and **than**.",
             "micro_edit": None, "confidence": 0.9})

    for pattern, fix, note in TYPO_OVERRIDES:
        m = pattern.search(t)
        if m:
            note_str = f" ({note})" if note else ""
            add(make_card("spelling", f"Typo: “{m.group(0)}”",
                          f"Looks like **{fix}**{note_str}.", fix))

    for m in re.finditer(
        r"\bits\s+(ready|fine|done|finished|complete|correct|right|wrong|okay|ok|good|bad|better|worse|working|running|available|possible|clear|obvious|easy|hard|difficult|necessary|important|amazing|great|perfect|broken|stuck|gone|late|early|real|true|false|safe|dangerous|impossible)\b",
        t, re.I
    ):
        phrase = m.group(0).lower()
        add(make_card("apostrophe", f"Apostrophe confusion: “{phrase}”",
                      f"**Its** (no apostrophe) is the possessive pronoun. Before a predicate adjective like *{m.group(1).lower()}*, the contraction **it’s** (*it is*) is intended: **it’s {m.group(1).lower()}**.",
                      f"it's {m.group(1).lower()}"))

    seen_were_q: set[str] = set()
    for m in re.finditer(
        r"\b(?:why|what|how)\s+were\s+(?:here|there|doing|going|saying|talking|waiting|leaving|staying|working|meeting|watching|helping|trying|looking)\b",
        t, re.I
    ):
        phrase = m.group(0).lower()
        if phrase in seen_were_q:
            continue
        seen_were_q.add(phrase)
        add(make_card("homophone", f"Word confusion: “{phrase}”",
                      "**Were** is the past-tense plural of *to be*. After a question word like *why* or *what*, the contraction **we’re** (*we are*) is almost always intended.",
                      None))

    seen_repeated: set[str] = set()
    for m in re.finditer(r"\b(\w{2,})\b(?:\s+\1\b)+", t, re.I):
        word = m.group(1).lower()
        if word in seen_repeated:
            continue
        seen_repeated.add(word)
        add(make_card("repetition", f"Repeated word: “{m.group(1)}”",
                      f"“{m.group(1)}” appears back-to-back. This is likely an accidental duplication—delete the extra copy.",
                      m.group(1), 0.92), 0.92)

    seen_stretched: set[str] = set()
    stretched_count = 0
    for m in re.finditer(r"\b([a-z]{4,})\b", t, re.I):
        if stretched_count >= HEURISTIC_THRESHOLDS["MAX_STRETCHED_CARDS"]:
            break
        w = m.group(1)
        if not re.search(r"([a-z])\1{2}", w, re.I):
            continue
        lw = w.lower()
        if lw in seen_stretched:
            continue
        seen_stretched.add(lw)
        stretched_count += 1
        add(make_card("stretched_word", f"Stretched word: “{w}”",
                      f"Repeating a letter for emphasis (*{w}*) is a spoken-language cue. In written form it may not land as intended—consider italics, an em dash, or a stronger word.",
                      None, 0.72), 0.72)

    seen_lower_start: set[str] = set()
    lower_start_count = 0
    for m in re.finditer(r"[.!?]\s+([a-z]\w*)", t):
        if lower_start_count >= HEURISTIC_THRESHOLDS["MAX_LOWERCASE_START_CARDS"]:
            break
        word = m.group(1)
        if word in seen_lower_start:
            continue
        seen_lower_start.add(word)
        lower_start_count += 1
        add(make_card("capitalization", f"Lowercase letter after sentence end: “{word}”",
                      f"“{word}” starts a new sentence but isn’t capitalized. Each sentence should begin with a capital letter.",
                      word[0].upper() + word[1:]))

    uncap_i_matches = list(re.finditer(r"(?:^|\s)(i)(?=\s|[',;.!?]|$)", t, re.MULTILINE))
    has_mid_sentence_i = any(
        not re.search(r"[.!?]\s*$", t[:m.start() + m.group(0).index("i")])
        for m in uncap_i_matches
    )
    if has_mid_sentence_i:
        add(make_card("capitalization", "Uncapitalized “I”",
                      'When “i” refers to yourself, it should always be capitalized: **I**.', None))

    return out[:HEURISTIC_THRESHOLDS["OBVIOUS_MAX_CARDS"]]


def collect_punctuation_mechanics(text: str) -> list[dict]:
    suggestions: list[dict] = []

    def push(card: dict, confidence: float | None = None):
        conf = confidence if confidence is not None else card.get("confidence", 0.9)
        if conf < CONFIDENCE_MIN:
            return
        suggestions.append({**card, "confidence": conf})

    for m in re.finditer(
        r"(?:^|[.!?]\s+)(Wait|Hey|Well|Oh)\s+,?\s*(what|who|where|why|how)\b", text, re.I
    ):
        tail = text[m.start():m.start() + 80]
        if "?" in tail.split("\n")[0]:
            continue
        push(make_card("punctuation", f"Missing question mark: “{m.group(0).strip()}”",
                       "This reads as a question. Add a **?** or rephrase as a statement.", None, 0.88), 0.88)

    comma_splice_patterns = [
        re.compile(r",\s+(?:I\b|(?:he|she|they|we|it|nobody|everyone|somebody|someone|anyone|no\s+one)\s)", re.I),
        re.compile(r"\b[^.!?\n]{6,},\s+[a-z]+\s+(?:i|you|we|they|he|she|it)\b", re.I),
    ]
    for p in comma_splice_patterns:
        m = p.search(text)
        if not m:
            continue
        idx = m.start()
        snippet = re.sub(r"\s+", " ", text[max(0, idx - 25):min(len(text), idx + len(m.group(0)) + 25)].strip())
        push(make_card("punctuation", f"Possible comma splice: “{snippet}”",
                       "A comma may be joining two full thoughts without a conjunction. Try a period, semicolon, or connector (*because*, *so*, *and*).",
                       None, 0.88), 0.88)
        break

    seen_semi_conj: set[str] = set()
    semi_conj_count = 0
    for m in re.finditer(r";\s*(and|but|or|so|for|nor|yet)\b", text, re.I):
        if semi_conj_count >= 3:
            break
        idx = m.start()
        snippet = re.sub(r"\s+", " ", text[max(0, idx - 20):min(len(text), idx + len(m.group(0)) + 20)].strip())[:50].rstrip()
        key = snippet.lower()
        if key in seen_semi_conj:
            continue
        seen_semi_conj.add(key)
        push(make_card("punctuation", f"Semicolon before conjunction: “{snippet}”",
                       f"A semicolon before *{m.group(1)}* is usually a sign to use a comma instead.", None, 0.95), 0.95)
        semi_conj_count += 1

    seen_semi_sub: set[str] = set()
    sub_count = 0
    for m in re.finditer(
        r";\s*(because|although|since|while|if|though|unless|until|after|before|once|even though)\b",
        text, re.I
    ):
        if sub_count >= 3:
            break
        idx = m.start()
        snippet = re.sub(r"\s+", " ", text[max(0, idx - 20):min(len(text), idx + len(m.group(0)) + 20)].strip())[:55].rstrip()
        key = snippet.lower()
        if key in seen_semi_sub:
            continue
        seen_semi_sub.add(key)
        push(make_card("punctuation", f"Semicolon before subordinating conjunction: “{snippet}”",
                       f"*{m.group(1)}* opens a dependent clause — remove the semicolon before it.", None, 0.96), 0.96)
        sub_count += 1

    seen_colon: set[str] = set()
    for m in re.finditer(r":\s*(and|but|or|so|for|nor|yet)\b", text, re.I):
        idx = m.start()
        snippet = re.sub(r"\s+", " ", text[max(0, idx - 20):min(len(text), idx + len(m.group(0)) + 20)].strip())[:55].rstrip()
        key = snippet.lower()
        if key in seen_colon:
            continue
        seen_colon.add(key)
        push(make_card("punctuation", f"Colon before conjunction: “{snippet}”",
                       f"A colon should not precede the coordinating conjunction *{m.group(1)}*. Use a comma instead.",
                       None, 0.96), 0.96)

    seen_conj_adv: set[str] = set()
    for m in re.finditer(
        r"\b(however|therefore|furthermore|moreover|nevertheless|nonetheless|consequently|accordingly|hence)\b",
        text, re.I
    ):
        adv = m.group(1).lower()
        if adv in seen_conj_adv:
            continue
        before = text[:m.start()].rstrip()
        if not before or re.search(r"[.!?\n;:]\s*$", before) or re.search(r",\s*$", before):
            continue
        seen_conj_adv.add(adv)
        push(make_card("punctuation", f"Missing punctuation before “{adv}”",
                       f"**{m.group(1)}** joins independent clauses — precede it with a semicolon or start a new sentence.",
                       None, 0.9), 0.9)

    seen_intro: set[str] = set()
    intro_count = 0
    for m in re.finditer(
        r"(?:^|[.!?]\s+)(When|While|After|Before|Since|Although|Because|If|Though|As|Once|Until|Unless|Even though|Whenever)\s+[^,;\n]{15,60}?\s+(I|he|she|we|they|you|the|it|this|that|there)\b",
        text, re.I
    ):
        if intro_count >= 3:
            break
        snippet = re.sub(r"^[^a-zA-Z]+", "", m.group(0).strip())[:55].rstrip()
        key = snippet.lower()
        if key in seen_intro:
            continue
        seen_intro.add(key)
        if len(snippet.split()) >= 6:
            push(make_card("punctuation", f"Missing comma after introductory clause: “{snippet}”",
                           f"When a sentence opens with *{m.group(1)}*, a comma typically follows before the main clause.",
                           None, 0.82), 0.82)
            intro_count += 1

    run_on_segments = [s.strip() for s in re.split(r"[.!?\n]+", text) if s.strip()]
    run_on_count = 0
    for seg in run_on_segments:
        if run_on_count >= 4:
            break
        word_count = len(seg.split())
        if word_count < 8 or word_count > 55:
            continue
        if re.search(r"[,;]", seg):
            continue
        conj_count = len(re.findall(
            r"\b(?:and|but|or|so|nor|yet|because|although|while|since|if|when|that|which|who|whom|however|therefore|though)\b",
            seg, re.I
        ))
        pronoun_hits = re.findall(
            r"\b(?:I|he|she|we|they|you|it|nobody|everyone|someone|anyone)\b", seg, re.I
        )
        fused_by_counts = len(pronoun_hits) >= max(2, conj_count + 2)
        fused_by_verb = not fused_by_counts and bool(re.search(
            r"\b(?:[a-z]+ed|went|came|got|told|saw|heard|felt|knew|left|ran|fell|sat|stood|woke|found|lost|won|brought|caught|stopped|ended|finished|started|closed|walked|watched|talked)\s+(?:I|he|she|we|they|you|it|nobody|everyone|someone)\b",
            seg, re.I
        ))
        if fused_by_counts or fused_by_verb:
            snippet = re.sub(r'^["“‘\']+', "", seg)[:55].rstrip()
            push(make_card("punctuation", f"Possible run-on sentence: “{snippet}”",
                           "Two or more thoughts appear fused. Try a period, comma + conjunction, or semicolon.",
                           None, 0.92), 0.92)
            run_on_count += 1

    return suggestions


def heuristic_suggestions(text: str, mode: str = "paused", include_punctuation: bool = True) -> list[dict]:
    suggestions = collect_punctuation_mechanics(text) if include_punctuation else []
    paused_only = mode == "paused"

    if paused_only:
        for casual_re, formal_re, title, body in TONE_SHIFT_RULES:
            if casual_re.search(text) and formal_re.search(text):
                suggestions.append({"type": "voice", "issueType": "style", "title": title, "body": body, "micro_edit": None, "confidence": 0.9})

        casual_hits = re.findall(
            r"\b(?:shit|fuck(?:ing|ed|er)?|damn(?:it)?|crap|ass(?:hole)?|bitch(?:ing|ed)?|wtf|pissed|bullshit|bastard|dumbass|hell(?:uva)?|bloody|bugger|dickhead|cunt|screw(?:ing|ed)|freaking|friggin|effing|dammit|goddamn|moron|idiot|jerk)\b",
            text, re.I
        )
        distinct_casual = set(w.lower() for w in casual_hits)
        already_covered = any(cr.search(text) and fr.search(text) for cr, fr, _, _ in TONE_SHIFT_RULES)
        if len(distinct_casual) >= 2 and not already_covered:
            examples = ", ".join(f"“{w}”" for w in list(distinct_casual)[:3])
            suggestions.append({
                "type": "voice", "issueType": "style",
                "title": "Heavy informal/profane register",
                "body": f"This draft uses strong casual language throughout ({examples}…). That can be authentic voice—but if the audience is mixed or formal, one grounding sentence that signals the register is intentional can help readers follow the tone shift.",
                "micro_edit": None, "confidence": 0.9,
            })

        asks_without_mark = re.findall(r"\b(?:friend|they|she|he)\s+asks?\b(?![^.!?\n]*\?)", text, re.I)
        if asks_without_mark:
            suggestions.append({
                "type": "punctuation", "issueType": "punctuation",
                "title": "Question phrasing without “?”",
                "body": f"Phrases like “{asks_without_mark[0]}” read as questions to many readers. A question mark (or rephrasing as a statement) makes the conversation easier to follow.",
                "micro_edit": None, "confidence": 0.9,
            })

        sentences = [s for s in re.split(r"(?<=[.!?])\s+", text) if s]
        if len(sentences) > 1:
            long_ones = [s for s in sentences if len(s.split()) > HEURISTIC_THRESHOLDS["LONG_SENTENCE_WORDS"]]
            if long_ones:
                suggestions.append({
                    "type": "coherence", "issueType": "coherence",
                    "title": "Very long sentence(s)",
                    "body": "Readers track one main idea per sentence. Try splitting the longest sentence into two—give each sentence a single job.",
                    "micro_edit": None, "confidence": 0.9,
                })

        words = tokenize(text)
        counts: dict[str, int] = {}
        for w in words:
            if w in HEDGE_WORDS:
                counts[w] = counts.get(w, 0) + 1
        for w, c in counts.items():
            if c >= HEURISTIC_THRESHOLDS["HEDGE_REPEAT_MIN"]:
                suggestions.append({
                    "type": "pattern", "issueType": "style",
                    "title": f"Repeated hedge/filler: “{w}”",
                    "body": "This is often how people talk—and that is fine. If it clusters, readers may read it as uncertainty. Try cutting half of them on a second pass, not all.",
                    "micro_edit": None, "confidence": 0.9,
                })
                break

        if count_matches(text, re.compile(r"[!?]{2,}|\.{4,}")):
            suggestions.append({
                "type": "punctuation", "issueType": "punctuation",
                "title": "Repeated punctuation clusters",
                "body": "Repeated punctuation can be expressive. In formal or mixed audiences, reserve it for emphasis points so your main ideas still read as precise.",
                "micro_edit": None, "confidence": 0.9,
            })

        if (re.search(r"\brecord profits\b", text, re.I) and
                re.search(r"\bdeclining\b", text, re.I) and
                re.search(r"\b(?:shrinking|shrink)\b", text, re.I)):
            suggestions.append(make_card("coherence", "Contradictory statements",
                                         "The passage claims record profits and growth while also describing declining sales and shrinking revenue. Clarify which direction is accurate.",
                                         None))

    if "  " in text:
        suggestions.append(make_card("spacing", "Extra spaces",
                                     "Small formatting glitches can distract in polished contexts. Not a voice issue—just cleanup.", None))

    return suggestions[:HEURISTIC_THRESHOLDS["STRUCTURAL_MAX_CARDS"]]
