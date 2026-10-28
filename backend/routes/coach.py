from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth import CurrentUser, get_current_user
from coaching.pipeline import run_coach
from profile.analyzer import apply_dismiss
from routes.feedback_history import build_feedback_preferences

log = logging.getLogger(__name__)
router = APIRouter()


class CoachBody(BaseModel):
    text: str
    surface: str = "extension"
    coachMode: str = "paused"
    focus: list[str] = []
    goals: str = ""
    audience: str = ""
    tonePreference: str = "neutral"
    feedbackPreferences: dict | None = None


class DismissBody(BaseModel):
    title: str | None = None
    body: str | None = None
    type: str | None = None


@router.post("/coach")
async def proxy_coach(body: CoachBody, request: Request, user: CurrentUser = Depends(get_current_user)):
    request_id = str(request.headers.get("x-request-id", "") or uuid.uuid4())
    feedback_prefs = build_feedback_preferences(user.uid)

    payload = body.model_dump()
    payload["userId"] = user.uid
    payload["feedbackPreferences"] = feedback_prefs

    result = await run_coach(payload, meta={"requestId": request_id})
    if result.get("error"):
        return JSONResponse({"error": result["error"]}, status_code=result.get("status", 400))
    return result.get("payload", {})


@router.post("/dismiss")
async def proxy_dismiss(body: DismissBody, user: CurrentUser = Depends(get_current_user)):
    try:
        profile_snapshot = await apply_dismiss(user.uid, body.model_dump())
        return {"ok": True, "profileSnapshot": profile_snapshot}
    except Exception as exc:
        log.error("dismiss error: %s", exc)
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)
