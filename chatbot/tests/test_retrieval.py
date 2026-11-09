import io
import json
import unittest
from unittest import mock

import numpy as np

import retrieval
from retrieval import top_k_indices

QUERY = [1.0, 0.0]


def _row(source_file, score):
    chunk = {"text": source_file, "source_url": f"https://x/{source_file}", "source_file": source_file}
    return chunk, [score, (1 - score**2) ** 0.5]


class FakeS3:
    def __init__(self, rows):
        self.load(rows)

    def load(self, rows):
        buf = io.BytesIO()
        np.save(buf, np.array([v for _c, v in rows], dtype=np.float32))
        self.objects = {
            "embeddings.npy": buf.getvalue(),
            "chunks.json": json.dumps([c for c, _v in rows]).encode(),
        }

    def get_object(self, Bucket, Key):
        return {"Body": io.BytesIO(self.objects[Key])}


class FakeTitan:
    def invoke_model(self, modelId, body):
        return {"body": io.BytesIO(json.dumps({"embedding": QUERY}).encode())}


def install_index(test, rows):
    s3 = FakeS3(rows)
    for patcher in (
        mock.patch.dict(retrieval._clients, {"s3": s3, "bedrock-runtime": FakeTitan()}),
        mock.patch.dict(retrieval._cache, {"last_attempt_at": 0.0, "index": None}),
    ):
        patcher.start()
        test.addCleanup(patcher.stop)
    return s3


def test_top_k_ordering():
    matrix = np.array([[1, 0], [0, 1], [0.707, 0.707]], dtype=np.float32)
    q = np.array([1, 0], dtype=np.float32)
    assert top_k_indices(matrix, q, 2) == [0, 2]


def test_top_k_k_larger_than_n():
    matrix = np.array([[1, 0], [0, 1]], dtype=np.float32)
    q = np.array([0, 1], dtype=np.float32)
    assert top_k_indices(matrix, q, 10) == [1, 0]


def test_top_k_empty_and_zero_k():
    q = np.array([1.0], dtype=np.float32)
    assert top_k_indices(None, q, 5) == []
    assert top_k_indices(np.zeros((0, 1), dtype=np.float32), q, 5) == []
    assert top_k_indices(np.array([[1.0]], dtype=np.float32), q, 0) == []


class SearchDocsTests(unittest.TestCase):
    @staticmethod
    def _files(result):
        return [c["text"] for c in result["chunks"]]

    def test_returns_best_matches_first(self):
        install_index(self, [_row("a.md", 0.5), _row("b.md", 0.9), _row("c.md", 0.1)])
        self.assertEqual(self._files(retrieval.search_docs("q", k=2)), ["b.md", "a.md"])

    def test_refresh_keeps_rows_aligned_with_the_matrix(self):
        s3 = install_index(self, [_row("old.md", 0.5)])
        retrieval.search_docs("q", k=1)

        s3.load([_row("fresh.md", 0.2), _row("newer.md", 0.8)])
        with mock.patch.object(retrieval, "INDEX_TTL_SECONDS", -1):
            result = retrieval.search_docs("q", k=2)
        self.assertEqual(self._files(result), ["newer.md", "fresh.md"])

    def test_failed_refresh_keeps_the_previous_index_whole(self):
        s3 = install_index(self, [_row("old.md", 0.5)])
        retrieval.search_docs("q", k=1)

        s3.load([_row("a.md", 0.9), _row("b.md", 0.8)])
        s3.objects["chunks.json"] = b"not json"
        with mock.patch.object(retrieval, "INDEX_TTL_SECONDS", -1):
            result = retrieval.search_docs("q", k=5)
        self.assertEqual(self._files(result), ["old.md"])

    def test_missing_index_reports_empty_instead_of_failing(self):
        s3 = install_index(self, [_row("old.md", 0.5)])
        s3.objects.clear()
        self.assertEqual(self._files(retrieval.search_docs("q")), [])
