"""Ingestion Lambda — rebuild the docs RAG index.

The sync-chatbot-index workflow syncs docs/ to the source bucket, then invokes
this once. Each invoke rebuilds the *whole* index from the source bucket —
correct and simple at one-doc-site scale.

Output (written to the RAG index bucket):
  - chunks.json     list of {text, heading_path, source_url, source_file}
  - embeddings.npy  float32 [n_chunks, dim], L2-normalized (cosine == dot product)

Retrieval (in the orchestrator Lambda) is an exact numpy cosine search over
embeddings.npy — no FAISS/OpenSearch needed at this scale.
"""
from __future__ import annotations

import io
import json
import os
import random
import time
from concurrent.futures import ThreadPoolExecutor

import boto3
import numpy as np
from botocore.config import Config
from botocore.exceptions import ClientError

from chunker import chunk_markdown, strip_frontmatter

s3 = boto3.client("s3")
# Adaptive retries cover throttling at the SDK layer. ModelErrorException is not
# in botocore's retryable set, so _embed_one handles that one itself.
bedrock = boto3.client(
    "bedrock-runtime",
    config=Config(retries={"max_attempts": 5, "mode": "adaptive"}),
)

RAG_INDEX_BUCKET = os.environ["RAG_INDEX_BUCKET"]
TITAN_MODEL_ID = os.environ.get("TITAN_MODEL_ID", "amazon.titan-embed-text-v2:0")
DOCS_BASE_URL = os.environ.get("DOCS_BASE_URL", "https://docs.langguard.ai").rstrip("/")

# One invoke_model call per chunk, so wall time and failure odds both scale with
# the corpus. Concurrency keeps the rebuild well inside the Lambda timeout; 8 is
# conservative enough not to provoke the throttling it would then have to retry.
EMBED_WORKERS = int(os.environ.get("EMBED_WORKERS", "8"))
EMBED_ATTEMPTS = int(os.environ.get("EMBED_ATTEMPTS", "5"))

# Bedrock errors worth trying again. ModelErrorException is the one that has
# actually bitten: a transient server-side failure that arrives mid-rebuild and,
# without a retry, discards every embedding computed before it.
RETRYABLE_CODES = frozenset({
    "ModelErrorException",
    "ModelTimeoutException",
    "ModelNotReadyException",
    "ThrottlingException",
    "TooManyRequestsException",
    "ServiceUnavailableException",
    "InternalServerException",
})


def handler(event, _context):
    source_bucket = event["Records"][0]["s3"]["bucket"]["name"]

    chunks = []
    for key in _list_markdown(source_bucket):
        text, meta = strip_frontmatter(_get_text(source_bucket, key))
        source_url = _key_to_url(key, slug=meta.get("slug"))
        for ch in chunk_markdown(text):
            url = f"{source_url}#{ch.anchor}" if ch.anchor else source_url
            chunks.append(
                {
                    "text": ch.text,
                    "heading_path": " > ".join(ch.heading_path),
                    "source_url": url,
                    "source_file": key,
                }
            )

    if not chunks:
        print(f"No markdown chunks found in {source_bucket}; skipping index write.")
        return {"chunks": 0}

    embeddings = _embed_all([c["text"] for c in chunks])
    _write_index(chunks, embeddings)
    print(f"Indexed {len(chunks)} chunks ({embeddings.shape}) from {source_bucket}.")
    return {"chunks": len(chunks)}


def _list_markdown(bucket: str):
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket):
        for obj in page.get("Contents", []):
            if obj["Key"].endswith(".md"):
                yield obj["Key"]


def _get_text(bucket: str, key: str) -> str:
    return s3.get_object(Bucket=bucket, Key=key)["Body"].read().decode("utf-8")


def _key_to_url(key: str, slug: str = None) -> str:
    """Map an S3 markdown key (or a frontmatter slug override) to its page URL."""
    if slug:
        return f"{DOCS_BASE_URL}/{slug.strip('/')}/" if slug.strip("/") else f"{DOCS_BASE_URL}/"
    p = key[:-3] if key.endswith(".md") else key
    if p == "index" or p.endswith("/index"):
        p = p[: -len("index")]
    p = p.strip("/")
    return f"{DOCS_BASE_URL}/{p}/" if p else f"{DOCS_BASE_URL}/"


def _embed_one(text: str) -> list:
    """Embed one chunk, retrying the transient Bedrock failures with backoff.

    A rebuild is all-or-nothing: the index is only written once every chunk has
    an embedding, so an un-retried failure on chunk 800 of 1350 throws away the
    other 1349. Retrying here is what makes the rebuild survivable at corpus
    sizes where hitting at least one transient error per run is the norm.
    """
    delay = 0.5
    for attempt in range(1, EMBED_ATTEMPTS + 1):
        try:
            # Titan caps inputText at 50k chars; truncate defensively so one
            # oversized chunk can never fail the whole rebuild (the chunker
            # should prevent this).
            resp = bedrock.invoke_model(
                modelId=TITAN_MODEL_ID,
                body=json.dumps({"inputText": text[:45000]}),
            )
            return json.loads(resp["body"].read())["embedding"]
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code not in RETRYABLE_CODES or attempt == EMBED_ATTEMPTS:
                raise
            # Jitter so concurrent workers that hit the same blip do not all
            # come back at the same instant and cause the next one.
            time.sleep(delay + random.uniform(0, 0.25))
            delay = min(delay * 2, 8.0)
    raise AssertionError("unreachable")  # pragma: no cover


def _embed_all(texts) -> np.ndarray:
    # ThreadPoolExecutor.map preserves input order, which matters: embeddings
    # are matched to chunks positionally when the index is written.
    with ThreadPoolExecutor(max_workers=EMBED_WORKERS) as pool:
        vecs = list(pool.map(_embed_one, texts))
    arr = np.array(vecs, dtype=np.float32)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return arr / norms


def _write_index(chunks, embeddings: np.ndarray) -> None:
    buf = io.BytesIO()
    np.save(buf, embeddings)
    s3.put_object(Bucket=RAG_INDEX_BUCKET, Key="embeddings.npy", Body=buf.getvalue())
    s3.put_object(
        Bucket=RAG_INDEX_BUCKET,
        Key="chunks.json",
        Body=json.dumps(chunks, ensure_ascii=False).encode("utf-8"),
        ContentType="application/json",
    )
