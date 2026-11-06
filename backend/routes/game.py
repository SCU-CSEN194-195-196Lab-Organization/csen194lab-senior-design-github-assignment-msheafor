from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from game.hint_bank import pick_hint

router = APIRouter(prefix="/game", tags=["game"])


class HintBody(BaseModel):
    case_number: int
    suspect_id: int | None = None


@router.post("/hint")
async def game_hint(body: HintBody):
    """Return a hint for the player's current case.

    Hints come from game/hint_bank.py for now; this is where AI-generated
    hints will plug in later. No auth yet so the game prototype can call it. 
    Personalized hints will be tailored per profile. 
    """
    result = pick_hint(body.case_number)
    if result is None:
        return JSONResponse({"ok": False, "error": "unknown_case"}, status_code=404)
    grammar_type, text = result
    return {
        "ok": True,
        "case_number": body.case_number,
        "suspect_id": body.suspect_id,
        "grammar_type": grammar_type,
        "text": text,
        "speaker": "Penny",
    }