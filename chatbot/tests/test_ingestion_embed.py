import io
import json
import unittest
from unittest import mock

import ingestion_app as app
from botocore.exceptions import ClientError


def _client_error(code):
    return ClientError({"Error": {"Code": code, "Message": "boom"}}, "InvokeModel")


def _ok_response(vector):
    return {"body": io.BytesIO(json.dumps({"embedding": vector}).encode())}


class FakeBedrock:
    def __init__(self, fail_times=0, code="ModelErrorException"):
        self.fail_times = fail_times
        self.code = code
        self.calls = 0
        self.seen = []

    def invoke_model(self, modelId, body):
        self.calls += 1
        text = json.loads(body)["inputText"]
        if self.calls <= self.fail_times:
            raise _client_error(self.code)
        self.seen.append(text)
        return _ok_response([float(len(text)), 1.0, 0.0])


class EmbedRetryTests(unittest.TestCase):
    def setUp(self):
        self._sleep = mock.patch.object(app.time, "sleep", lambda _s: None)
        self._sleep.start()
        self.addCleanup(self._sleep.stop)

    def test_transient_model_error_is_retried_then_succeeds(self):
        fake = FakeBedrock(fail_times=3)
        with mock.patch.object(app, "bedrock", fake):
            vec = app._embed_one("hello")
        self.assertEqual(vec, [5.0, 1.0, 0.0])
        self.assertEqual(fake.calls, 4, "should have retried three times then succeeded")

    def test_gives_up_after_the_attempt_budget(self):
        fake = FakeBedrock(fail_times=99)
        with mock.patch.object(app, "bedrock", fake), \
                mock.patch.object(app, "EMBED_ATTEMPTS", 5):
            with self.assertRaises(ClientError):
                app._embed_one("hello")
        self.assertEqual(fake.calls, 5, "should stop at EMBED_ATTEMPTS, not loop forever")

    def test_throttling_is_retried(self):
        fake = FakeBedrock(fail_times=1, code="ThrottlingException")
        with mock.patch.object(app, "bedrock", fake):
            app._embed_one("hi")
        self.assertEqual(fake.calls, 2)

    def test_non_retryable_error_raises_immediately(self):
        fake = FakeBedrock(fail_times=99, code="ValidationException")
        with mock.patch.object(app, "bedrock", fake):
            with self.assertRaises(ClientError):
                app._embed_one("hello")
        self.assertEqual(fake.calls, 1, "must not burn retries on a permanent error")

    def test_oversized_text_is_truncated(self):
        fake = FakeBedrock()
        with mock.patch.object(app, "bedrock", fake):
            app._embed_one("x" * 60000)
        self.assertEqual(len(fake.seen[0]), 45000)


class EmbedAllTests(unittest.TestCase):
    def setUp(self):
        self._sleep = mock.patch.object(app.time, "sleep", lambda _s: None)
        self._sleep.start()
        self.addCleanup(self._sleep.stop)

    def test_order_is_preserved_under_concurrency(self):
        texts = ["a" * n for n in range(1, 41)]
        fake = FakeBedrock()
        with mock.patch.object(app, "bedrock", fake):
            arr = app._embed_all(texts)

        self.assertEqual(arr.shape, (40, 3))
        for row, text in zip(arr, texts):
            self.assertAlmostEqual(row[0] / row[1], len(text), places=3)
        self.assertEqual(fake.calls, 40)

    def test_rows_are_l2_normalised(self):
        fake = FakeBedrock()
        with mock.patch.object(app, "bedrock", fake):
            arr = app._embed_all(["one", "two", "three"])
        for row in arr:
            self.assertAlmostEqual(float((row ** 2).sum()) ** 0.5, 1.0, places=5)

    def test_one_flaky_chunk_does_not_fail_the_rebuild(self):
        fake = FakeBedrock(fail_times=1)
        with mock.patch.object(app, "bedrock", fake):
            arr = app._embed_all(["a", "b", "c", "d"])
        self.assertEqual(arr.shape, (4, 3))

