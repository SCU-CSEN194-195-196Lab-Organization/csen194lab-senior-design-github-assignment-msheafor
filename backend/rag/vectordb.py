from __future__ import annotations

import os
from pathlib import Path

import chromadb
from chromadb import Collection

_COLLECTION_NAME = "writing_coach"
_client: chromadb.PersistentClient | None = None
_collection: Collection | None = None


def _persist_path() -> str:
    # Vercel's deployment filesystem is read-only; only /tmp is writable
    if os.environ.get("VERCEL"):
        return "/tmp/chroma_db"
    raw = os.environ.get("CHROMA_PERSIST_PATH", "").strip()
    if raw:
        return raw
    return str(Path(__file__).parent.parent / "chroma_db")


async def init_chroma() -> None:
    global _client, _collection
    _client = chromadb.PersistentClient(path=_persist_path())
    _collection = _client.get_or_create_collection(
        name=_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def get_collection() -> Collection:
    if _collection is None:
        raise RuntimeError("Chroma not initialized — call init_chroma() first")
    return _collection


def upsert_chunks(
    ids: list[str],
    embeddings: list[list[float]],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    get_collection().upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


def query_chunks(
    query_embedding: list[float],
    n_results: int = 8,
    where: dict | None = None,
) -> list[dict]:
    col = get_collection()
    kwargs: dict = {"query_embeddings": [query_embedding], "n_results": n_results, "include": ["documents", "metadatas", "distances"]}
    if where:
        kwargs["where"] = where

    results = col.query(**kwargs)
    chunks = []
    ids = results.get("ids", [[]])[0]
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    dists = results.get("distances", [[]])[0]

    for chunk_id, doc, meta, dist in zip(ids, docs, metas, dists):
        # Chroma cosine distance: 0=identical, 2=opposite. Convert to similarity.
        similarity = 1.0 - (dist / 2.0)
        chunks.append({
            "id": chunk_id,
            "text": doc,
            "metadata": meta or {},
            "score": round(similarity, 4),
        })
    return chunks


def collection_count() -> int:
    return get_collection().count()
