from __future__ import annotations

import logging
import re
from pathlib import Path

from rag.embedder import embed
from rag.vectordb import collection_count, init_vector_db, upsert_chunks

log = logging.getLogger(__name__)

KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"

# Metadata applied per source file for webapp coaching chunks.
# chunk_type="coaching_guide" keeps them separate from future game hint chunks.
_SOURCE_META: dict[str, dict] = {
    "coaching-principles.md": {
        "chunk_type": "coaching_guide",
        "category": "coaching",
        "weight": 1.0,
        "level": "general",
    },
    "reader-centered-clarity.md": {
        "chunk_type": "coaching_guide",
        "category": "clarity",
        "weight": 1.1,
        "level": "general",
    },
    "grammar-and-punctuation-rules.md": {
        "chunk_type": "coaching_guide",
        "category": "grammar",
        "weight": 1.2,
        "level": "general",
    },
}

_DEFAULT_META = {
    "chunk_type": "coaching_guide",
    "category": "coaching",
    "weight": 1.0,
    "level": "general",
}


def _load_chunks() -> list[tuple[str, str, dict]]:
    """Return list of (id, text, metadata) for every paragraph in every .md file."""
    chunks: list[tuple[str, str, dict]] = []
    md_files = sorted(KNOWLEDGE_DIR.glob("*.md"))
    for md_file in md_files:
        raw = md_file.read_text(encoding="utf-8")
        paragraphs = [p.strip() for p in re.split(r"\n{2,}", raw) if p.strip()]
        base_meta = _SOURCE_META.get(md_file.name, _DEFAULT_META)
        for i, para in enumerate(paragraphs):
            chunk_id = f"{md_file.stem}#{i}"
            meta = {**base_meta, "source": md_file.name}
            # Populate game-schema fields with defaults so the schema is consistent
            # even before game hint chunks are added.
            meta.setdefault("grammar_type", "")
            meta.setdefault("case_number", 0)
            meta.setdefault("hint_level", 0)
            meta.setdefault("game_xp_tag", "")
            chunks.append((chunk_id, para, meta))
    return chunks


async def ensure_ingested() -> None:
    """Ingest knowledge base into Pinecone on startup. No-op if already populated."""
    await init_vector_db()
    count = collection_count()
    if count > 0:
        log.info("Pinecone already has %d chunks — skipping ingest", count)
        return

    chunks = _load_chunks()
    if not chunks:
        log.warning("No .md files found in %s — nothing to ingest", KNOWLEDGE_DIR)
        return

    ids = [c[0] for c in chunks]
    texts = [c[1] for c in chunks]
    metadatas = [c[2] for c in chunks]

    log.info("Embedding %d knowledge chunks...", len(texts))
    embeddings = embed(texts)
    try:
        upsert_chunks(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
        log.info("Ingested %d chunks into Pinecone from %s", len(chunks), KNOWLEDGE_DIR)
    except Exception as exc:
        log.error("Pinecone ingest failed — backend starting without knowledge base, coaching will be degraded: %s", exc)
