"""Semantic-search embeddings via the Gemini API.

Uses the same GEMINI_API_KEY as the AI chatbot. Each document is flattened into
text (title/authors/keywords/abstract) and embedded to a fixed-dimensional,
L2-normalized vector that powers the in-memory NumPy cosine search (see documents/search.py).
"""
import json
import math
import os
import time
import urllib.error
import urllib.request

# Embedding model name (configurable via env so it can be upgraded without a code change).
GEMINI_EMBEDDING_MODEL = os.environ.get("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001").strip()

# We request 1536 dimensions (vs the model's native 3072) to halve storage/transfer cost.
# Gemini only auto-normalizes the full-size output, so we L2-normalize manually below.

EMBEDDING_DIMENSIONS = 1536

# Bump this whenever the embedding model/dimensions change so stale vectors are re-generated.
EMBEDDING_VERSION = 1

# batchEmbedContents supports up to 100 inputs per request.
# Keep batches modest so we stay well under the free-tier rate limits,
_BATCH_SIZE = 25
_MAX_RETRIES = 5


def build_document_text(doc):
    """Flatten a Document into the text that is embedded (title/authors/keywords/abstract)."""
    parts = [
        doc.title,
        doc.authors or "",
        (doc.keywords or "").replace(",", " "),
        doc.abstract or "",
    ]
    return "\n".join(part.strip() for part in parts if part.strip())


def l2_normalize(vector):
    """L2-normalize a vector in place-free manner (Gemini does not auto-normalize
    reduced-dimensionality output, so this is required for cosine similarity to be correct."""
    norm = math.sqrt(sum(x * x for x in vector))
    if norm == 0:
        return vector
    return [x / norm for x in vector]


def embed_texts(texts, task_type="RETRIEVAL_DOCUMENT"):
    """Embed a list of texts via the Gemini batch endpoint.

    Returns a list of (EMBEDDING_DIMENSIONS,)-length lists of floats, in the same order
    as the inputs. Raises on API/network errors so callers can fall back to keyword search.
"""
    if not texts:
        return []
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured; embeddings cannot be generated.")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        + GEMINI_EMBEDDING_MODEL
        + ":batchEmbedContents?key="
        + api_key
    )

    results = []
    for start in range(0, len(texts), _BATCH_SIZE):
        batch = texts[start:start + _BATCH_SIZE]
        payload = {
            "requests": [
                {
                    "model": "models/" + GEMINI_EMBEDDING_MODEL,
                    "content": {"parts": [{"text": text}]},
                    "taskType": task_type,
                    "outputDimensionality": EMBEDDING_DIMENSIONS,
                }
                for text in batch
            ]
        }
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url, data=body, headers={"Content-Type": "application/json"}, method="POST"
        )
        result = None
        for attempt in range(_MAX_RETRIES):

            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    result = json.loads(resp.read().decode("utf-8"))
                break
            except urllib.error.HTTPError as exc:
                if exc.code == 429 and attempt < _MAX_RETRIES - 1:
                    time.sleep(4)
                    continue
                raise


        if result is None:
            raise RuntimeError("Embedding request failed after retries.")

        embeddings = result.get("embeddings") or []
        if len(embeddings) != len(batch):
            raise RuntimeError("Embedding API returned an unexpected number of vectors.")
        results.extend(l2_normalize(item["values"]) for item in embeddings)

    return results


def embed_query(text):
    """Embed a single user query with the retrieval-query task type."""
    vectors = embed_texts([text], task_type="RETRIEVAL_QUERY")
    return vectors[0] if vectors else []
