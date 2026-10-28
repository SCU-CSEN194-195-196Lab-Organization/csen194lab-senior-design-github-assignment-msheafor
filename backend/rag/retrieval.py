from __future__ import annotations

from rag.embedder import embed_one
from rag.vectordb import query_chunks

RAG_TOP_K = 8
_TAIL_CHARS = 520
_TAIL_MIN_CHARS = 100


def _merge_hits(lists: list[list[dict]], top_k: int) -> list[dict]:
    by_id: dict[str, dict] = {}
    for lst in lists:
        for item in lst:
            prev = by_id.get(item["id"])
            if not prev or item["score"] > prev["score"]:
                by_id[item["id"]] = item
    return sorted(by_id.values(), key=lambda x: x["score"], reverse=True)[:top_k]


def retrieve_for_coaching(draft_text: str, top_k: int = RAG_TOP_K) -> list[dict]:
    """Semantic retrieval for coaching guidance chunks only (no game hints)."""
    trimmed = draft_text.strip()
    where = {"chunk_type": {"$eq": "coaching_guide"}}

    main_hits = query_chunks(embed_one(trimmed), n_results=top_k, where=where)

    tail = trimmed[-_TAIL_CHARS:]
    tail_hits = (
        query_chunks(embed_one(tail), n_results=min(6, top_k), where=where)
        if len(tail) >= _TAIL_MIN_CHARS and tail != trimmed
        else []
    )

    merged = _merge_hits([main_hits, tail_hits], top_k)
    # Apply per-chunk weight to final score so higher-weight categories surface first
    for item in merged:
        weight = float(item["metadata"].get("weight", 1.0))
        item["score"] = round(item["score"] * weight, 4)
    return sorted(merged, key=lambda x: x["score"], reverse=True)


def retrieve_from_user_drafts(drafts: list[dict], query_text: str, top_k: int = 2) -> list[dict]:
    """Lightweight cosine rerank of in-memory user draft history (no Chroma)."""
    if not drafts:
        return []

    from rag.embedder import embed

    query_emb = embed_one(query_text)
    draft_texts = [str(d.get("text", "")) for d in drafts]
    draft_embs = embed(draft_texts)

    def _cosine(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        na = sum(x * x for x in a) ** 0.5
        nb = sum(x * x for x in b) ** 0.5
        if not na or not nb:
            return 0.0
        return dot / (na * nb)

    scored = [
        {"id": d.get("id", f"draft-{i}"), "text": draft_texts[i], "score": _cosine(query_emb, draft_embs[i]), "metadata": {"chunk_type": "user_draft", "source": "user-draft-history"}}
        for i, d in enumerate(drafts)
    ]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return [s for s in scored[:top_k] if s["score"] > 0]
