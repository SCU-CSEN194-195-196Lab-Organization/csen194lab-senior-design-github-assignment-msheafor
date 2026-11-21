from __future__ import annotations

import os

from pinecone import Pinecone

_index_name = os.environ.get("PINECONE_INDEX_NAME", "writing-coach")
_pc: Pinecone | None = None
_index = None
_host: str | None = None


def _get_index():
    global _pc, _index, _host
    if _index is None:
        _pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
        _index = _pc.Index(_index_name)
        raw = _pc.describe_index(_index_name).host
        _host = raw if raw.startswith("http") else f"https://{raw}"
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
    namespace = os.environ.get("PINECONE_NAMESPACE", "default")
    records = [
        {"_id": id_, "_values": emb, "text": doc, **meta}
        for id_, emb, doc, meta in zip(ids, embeddings, documents, metadatas)
    ]
    for i in range(0, len(records), 100):
        idx.upsert_records(namespace=namespace, records=records[i : i + 100])


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
