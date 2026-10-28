from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth import CurrentUser, get_current_user
from firebase.init import get_db

router = APIRouter()


class OnboardingBody(BaseModel):
    writingSample: str | None = None
    goals: str | None = None
    experienceLevel: str | None = None


@router.post("/onboarding")
async def onboarding_create(body: OnboardingBody, user: CurrentUser = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()

    patch: dict = {
        "userId": user.uid,
        "onboardingComplete": True,
        "onboardingAt": now,
        "updatedAt": now,
    }
    if body.writingSample:
        patch["onboardingWritingSample"] = body.writingSample.strip()[:24000]
    if body.goals is not None:
        patch["onboardingGoals"] = body.goals
    if body.experienceLevel is not None:
        patch["onboardingExperienceLevel"] = str(body.experienceLevel)[:120]

    try:
        get_db().collection("users").document(user.uid).set(patch, merge=True)
        return {"ok": True}
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)
