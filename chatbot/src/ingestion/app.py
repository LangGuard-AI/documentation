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

EMBED_WORKERS = int(os.environ.get("EMBED_WORKERS", "8"))
EMBED_ATTEMPTS = int(os.environ.get("EMBED_ATTEMPTS", "5"))

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
    if slug:
        return f"{DOCS_BASE_URL}/{slug.strip('/')}/" if slug.strip("/") else f"{DOCS_BASE_URL}/"
    p = key[:-3] if key.endswith(".md") else key
    if p == "index" or p.endswith("/index"):
        p = p[: -len("index")]
    p = p.strip("/")
    return f"{DOCS_BASE_URL}/{p}/" if p else f"{DOCS_BASE_URL}/"


def _embed_one(text: str) -> list:
    delay = 0.5
    for attempt in range(1, EMBED_ATTEMPTS + 1):
        try:
            resp = bedrock.invoke_model(
                modelId=TITAN_MODEL_ID,
                body=json.dumps({"inputText": text[:45000]}),
            )
            return json.loads(resp["body"].read())["embedding"]
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code not in RETRYABLE_CODES or attempt == EMBED_ATTEMPTS:
                raise
            time.sleep(delay + random.uniform(0, 0.25))
            delay = min(delay * 2, 8.0)
    raise AssertionError("unreachable")  # pragma: no cover


def _embed_all(texts) -> np.ndarray:
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
