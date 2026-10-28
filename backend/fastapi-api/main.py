from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from rag.ingest import ensure_ingested
from routes import coach, dismissals, documents, feedback_history, onboarding, preferences, users

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_ingested()
    yield


app = FastAPI(title="Write Up API", lifespan=lifespan)

_raw_origins = os.environ.get("APP_CORS_ORIGINS", "").strip()
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()] if _raw_origins else [
    "http://localhost:5173",
    "https://docs.google.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_headers=["Authorization", "Content-Type", "X-Request-Id"],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

app.include_router(users.router, prefix="/api")
app.include_router(onboarding.router, prefix="/api")
app.include_router(dismissals.router, prefix="/api")
app.include_router(preferences.router, prefix="/api")
app.include_router(feedback_history.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(coach.router)


@app.get("/")
def root():
    return {"ok": True, "service": "fastapi-api", "health": "/health"}


@app.get("/health")
def health():
    return {"ok": True, "service": "fastapi-api"}
