from __future__ import annotations

import os

from pinecone import Pinecone

_index_name = os.environ.get("PINECONE_INDEX_NAME", "writing-coach")
_pc: Pinecone | None = None
_index = None


def _get_index():
    global _pc, _index
    if _index is None:
        _pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
        _index = _pc.Index(_index_name)
    return _index


async def init_vector_db() -> None:
    _get_index()


def upsert_chunks(
    ids: list[str],
    embeddings: list[list[float]],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    idx = _get_index()
    vectors = [
        {"id": id_, "values": emb, "metadata": {**meta, "text": doc}}
        for id_, emb, doc, meta in zip(ids, embeddings, documents, metadatas)
    ]
    for i in range(0, len(vectors), 100):
        idx.upsert(vectors=vectors[i : i + 100])


def query_chunks(
    query_embedding: list[float],
    n_results: int = 8,
    where: dict | None = None,
) -> list[dict]:
    idx = _get_index()
    kwargs: dict = {
        "vector": query_embedding,
        "top_k": n_results,
        "include_metadata": True,
    }
    if where:
        kwargs["filter"] = where

    results = idx.query(**kwargs)
    chunks = []
    for match in results.matches:
        meta = dict(match.metadata or {})
        text = meta.pop("text", "")
        chunks.append({
            "id": match.id,
            "text": text,
            "metadata": meta,
            "score": round(match.score, 4),
        })
    return chunks


def collection_count() -> int:
    stats = _get_index().describe_index_stats()
    return stats.total_vector_count
