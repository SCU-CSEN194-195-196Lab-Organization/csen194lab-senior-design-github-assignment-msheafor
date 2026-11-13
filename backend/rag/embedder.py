from __future__ import annotations

import os

import httpx

_JINA_URL = "https://api.jina.ai/v1/embeddings"
_JINA_MODEL = "jina-embeddings-v3"


def _api_key() -> str:
    key = os.environ.get("JINA_API_KEY", "").strip()
    if not key:
        raise RuntimeError("JINA_API_KEY is not set")
    return key


def embed(texts: list[str]) -> list[list[float]]:
    resp = httpx.post(
        _JINA_URL,
        headers={"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"},
        json={"model": _JINA_MODEL, "input": texts},
        timeout=30.0,
    )
    resp.raise_for_status()
    return [item["embedding"] for item in resp.json()["data"]]


def embed_one(text: str) -> list[float]:
    return embed([text])[0]
