"""search_docs retrieval over the S3 RAG index.

The ingestion Lambda writes `embeddings.npy` (float32, L2-normalized rows) and
`chunks.json` to the RAG bucket. At this corpus size (hundreds to a few
thousand chunks) an exact numpy dot-product search is sub-millisecond — no
FAISS/vector DB needed. The index is cached in the warm Lambda container and
refreshed after INDEX_TTL_SECONDS so doc updates show up without a redeploy.
"""
from __future__ import annotations

import io
import json
import os
import time
from typing import NamedTuple

import numpy as np

RAG_INDEX_BUCKET = os.environ.get("RAG_INDEX_BUCKET", "")
TITAN_MODEL_ID = os.environ.get("TITAN_MODEL_ID", "amazon.titan-embed-text-v2:0")
INDEX_TTL_SECONDS = int(os.environ.get("INDEX_TTL_SECONDS", "900"))
TOP_K = int(os.environ.get("SEARCH_TOP_K", "5"))



class _Index(NamedTuple):
    matrix: np.ndarray
    chunks: list


_cache = {"at": 0.0, "index": None}
_clients = {}


def top_k_indices(matrix, qvec, k: int):
    """Indices of the top-k cosine matches, best first (rows pre-normalized)."""
    if matrix is None or len(matrix) == 0 or k <= 0:
        return []
    scores = matrix @ qvec
    k = min(k, len(scores))
    part = np.argpartition(-scores, k - 1)[:k]
    return part[np.argsort(-scores[part])].tolist()


def search_docs(query: str, k: int = None):
    """Tool entry point. Returns the toolResult payload for the model."""
    k = k or TOP_K
    _ensure_loaded()
    index = _cache["index"]
    if index is None or not index.chunks:
        return {"chunks": [], "note": "documentation index is empty or unavailable"}
    matrix, chunks = index
    qvec = _embed_query(query)
    out = []
    for i in top_k_indices(matrix, qvec, k):
        c = chunks[i]
        out.append(
            {
                "text": c["text"],
                "heading_path": c.get("heading_path", ""),
                "source_url": c.get("source_url", ""),
            }
        )
    return {"chunks": out}


def _client(name: str):
    if name not in _clients:
        import boto3  # lazy: keeps module importable without AWS for tests

        _clients[name] = boto3.client(name)
    return _clients[name]


def _ensure_loaded():
    now = time.time()
    if _cache["index"] is not None and now - _cache["at"] < INDEX_TTL_SECONDS:
        return
    try:
        s3 = _client("s3")
        emb = s3.get_object(Bucket=RAG_INDEX_BUCKET, Key="embeddings.npy")["Body"].read()
        raw_chunks = s3.get_object(Bucket=RAG_INDEX_BUCKET, Key="chunks.json")["Body"].read()
        _cache["index"] = _Index(np.load(io.BytesIO(emb)), json.loads(raw_chunks))
        _cache["at"] = now
    except Exception as exc:  # missing index must not take the chatbot down
        print(f"retrieval: failed to load index: {exc}")
        _cache["at"] = now  # keep serving the previous index until the next TTL


def _embed_query(query: str):
    resp = _client("bedrock-runtime").invoke_model(
        modelId=TITAN_MODEL_ID, body=json.dumps({"inputText": query})
    )
    vec = np.array(json.loads(resp["body"].read())["embedding"], dtype=np.float32)
    n = np.linalg.norm(vec)
    return vec / n if n else vec
