"""In-memory semantic search engine.

Builds a cached N×D NumPy matrix from every document's stored embedding and ranks
documents by cosine similarity to the embedded query. At the repository's scale (~260 docs ×
1536 dims),the brute-force dot product runs in well under a millisecond — so a dedicated
vector database (e.g. pgvector) is unnecessary here. The cache is rebuilt automatically
whenever the corpus changes (detected via count + newest embedding timestamp).
"""
import threading

import numpy as np
from django.db.models import Max

from .embeddings import embed_query
from .models import Document

_lock = threading.Lock()
_cache = {"key": None, "ids": None, "matrix": None}


def _cache_key():
    """A cheap fingerprint of the embedded corpus (rebuild when it changes)."""
    return (
        Document.objects.count(),
        Document.objects.filter(search_embedding__isnull=False).count(),
        Document.objects.aggregate(max_date=Max("embedding_updated_at"))["max_date"],
    )


def _load():
    """Return (doc_ids, matrix) where matrix is (N, D) float32 with unit rows.."""
    global _cache
    cache_key = _cache_key()
    with _lock:
        if _cache["key"] == cache_key and _cache["matrix"] is not None:
            return _cache["ids"], _cache["matrix"]

    rows = list(
        Document.objects.exclude(search_embedding__isnull=True)
        .exclude(search_embedding=[])
        .values_list("id", "search_embedding")
    )
    if not rows:
        with _lock:
            _cache = {"key": cache_key, "ids": [], "matrix": None}
        return [], None

    ids = [int(row[0]) for row in rows]
    matrix = np.asarray([list(map(float, row[1])) for row in rows], dtype=np.float32)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    matrix = matrix / norms  # Unit rows -> dot product with a unit query = cosine similarity.

    with _lock:
        _cache = {"key": cache_key, "ids": ids, "matrix": matrix}
    return ids, matrix


def semantic_search(query, limit=None, min_score=0.0):
    """Rank document ids by cosine similarity to the query text.

    Returns a list of (document_id, similarity_score) tuples, best first. Returns [] when
    embeddings are unavailable or the query cannot be embedded (callers should fall back).
    """
    try:
        ids, matrix = _load()
        if matrix is None:
            return []
    except Exception:
        return []

    try:
        query_vec = np.asarray(embed_query(query), dtype=np.float32)
    except Exception:
        return []
    qnorm = np.linalg.norm(query_vec)
    if qnorm == 0 or not np.isfinite(qnorm):
        return []
    query_vec = query_vec / qnorm

    scores = matrix @ query_vec  # (N,) — both sides unit vectors, so this is cosine.
    order = np.argsort(-scores)
    results = []
    for idx in order:
        score = float(scores[idx])
        if min_score and score < min_score:
            break
        results.append((int(ids[idx]), score))
        if limit and len(results) >= limit:
            break
    return results


def invalidate_cache():
    """Drop the cached matrix after the corpus/embeddings change."""
    with _lock:
        _cache["key"] = None
        _cache["ids"] = None
        _cache["matrix"] = None