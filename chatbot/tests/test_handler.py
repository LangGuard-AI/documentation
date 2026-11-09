import json
import unittest
from unittest import mock

import orchestrator_app as app
import system_prompt
from test_retrieval import _row, install_index


class FakeBedrock:
    def __init__(self, responses=None):
        self.calls = []
        self.responses = list(responses or [])

    def converse(self, **kwargs):
        self.calls.append(kwargs)
        if self.responses:
            return self.responses.pop(0)
        return _end_turn("hello")


def _end_turn(text):
    return {"stopReason": "end_turn", "output": {"message": {"role": "assistant", "content": [{"text": text}]}}}


def _search_turn(query="q"):
    return {
        "stopReason": "tool_use",
        "output": {
            "message": {
                "role": "assistant",
                "content": [{"toolUse": {"toolUseId": "t1", "name": "search_docs", "input": {"query": query}}}],
            }
        },
    }


def _post_raw(raw):
    return app.handler({"body": raw}, None)


def _post(**body):
    return _post_raw(json.dumps({"message": "hi", **body}))


class HandlerBase(unittest.TestCase):
    def setUp(self):
        self.bedrock = FakeBedrock()
        self.allow_request = mock.Mock(return_value=True)
        self.budget_ok = mock.Mock(return_value=True)
        self.record_cost = mock.Mock()
        for patcher in (
            mock.patch.object(app, "bedrock", self.bedrock),
            mock.patch.object(app.rate_limit, "allow_request", self.allow_request),
            mock.patch.object(app.rate_limit, "budget_ok", self.budget_ok),
            mock.patch.object(app.rate_limit, "record_cost", self.record_cost),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)

    def assert_rejected_before_any_spend(self, resp):
        self.assertEqual(resp["statusCode"], 400)
        self.assertEqual(set(json.loads(resp["body"])), {"error"})
        self.assertEqual(self.bedrock.calls, [])
        self.allow_request.assert_not_called()
        self.budget_ok.assert_not_called()


class ValidationTests(HandlerBase):
    def test_non_object_json_body_is_rejected_before_any_spend(self):
        for raw in ("[1]", "[]", '"hi"', "1", "null", "true", "[" * 200_000):
            with self.subTest(raw=raw[:10]):
                self.assert_rejected_before_any_spend(_post_raw(raw))

    def test_malformed_json_is_rejected_before_any_spend(self):
        self.assert_rejected_before_any_spend(_post_raw("{nope"))

    def test_bad_message_is_rejected_before_any_spend(self):
        for message in ("", "   ", None, 42, ["hi"], {"text": "hi"}, "x" * (app.MAX_MESSAGE_CHARS + 1)):
            with self.subTest(message=str(message)[:20]):
                self.assert_rejected_before_any_spend(_post_raw(json.dumps({"message": message})))


class ResponseTests(HandlerBase):
    def test_reply_has_exactly_reply_and_sources(self):
        resp = _post()
        self.assertEqual(resp["statusCode"], 200)
        self.assertEqual(json.loads(resp["body"]), {"reply": "hello", "sources": []})

    def test_sends_the_docs_prompt_and_only_search_docs(self):
        _post()
        call = self.bedrock.calls[0]
        self.assertEqual(call["system"][0]["text"], system_prompt.DOCS_SYSTEM_PROMPT)
        tools = [t["toolSpec"]["name"] for t in call["toolConfig"]["tools"] if "toolSpec" in t]
        self.assertEqual(tools, ["search_docs"])

    def test_sources_are_the_cited_chunk_urls(self):
        install_index(self, [_row("a.md", 0.9), _row("b.md", 0.5)])
        self.bedrock.responses = [_search_turn(), _end_turn("answer")]
        body = json.loads(_post()["body"])
        self.assertEqual(body["reply"], "answer")
        self.assertEqual(body["sources"][:2], ["https://x/a.md", "https://x/b.md"])

    def test_history_is_capped_at_twelve_turns(self):
        history = [
            {"role": "user" if i % 2 == 0 else "assistant", "text": f"turn {i}"} for i in range(40)
        ]
        _post(history=history)
        sent = [m["content"][0]["text"] for m in self.bedrock.calls[0]["messages"][:13]]
        self.assertEqual(sent, [f"turn {i}" for i in range(28, 40)] + ["hi"])

    def test_rate_limited_request_never_reaches_bedrock(self):
        self.allow_request.return_value = False
        resp = _post()
        self.assertEqual(resp["statusCode"], 429)
        body = json.loads(resp["body"])
        self.assertEqual(set(body), {"error", "reply"})
        self.assertTrue(body["reply"])
        self.assertEqual(self.bedrock.calls, [])
        self.budget_ok.assert_not_called()

    def test_spend_cap_replies_without_calling_bedrock(self):
        self.budget_ok.return_value = False
        resp = _post()
        self.assertEqual(resp["statusCode"], 200)
        self.assertEqual(json.loads(resp["body"]), {"reply": app.CAP_REPLY, "sources": []})
        self.assertEqual(self.bedrock.calls, [])

    def test_upstream_failure_is_502_with_a_reply(self):
        self.bedrock.converse = mock.Mock(side_effect=RuntimeError("bedrock down"))
        resp = _post()
        self.assertEqual(resp["statusCode"], 502)
        body = json.loads(resp["body"])
        self.assertEqual(set(body), {"error", "reply"})
        self.assertTrue(body["reply"])
        self.record_cost.assert_not_called()

    def test_recorded_cost_uses_the_turn_usage(self):
        self.bedrock.responses = [{**_end_turn("x"), "usage": {"inputTokens": 7, "outputTokens": 3}}]
        _post()
        self.record_cost.assert_called_once_with(app._ratelimit_table, 7, 3)


class DispatchTests(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.object(app.retrieval, "search_docs")
        self.search = patcher.start()
        self.addCleanup(patcher.stop)

    def test_refuses_every_name_except_search_docs_with_no_side_effect(self):
        for name in ("request_meeting", "get_availability", "request_whitepaper", "", "SEARCH_DOCS", "search_docs "):
            with self.subTest(name=name):
                dispatch, citations = app._make_dispatch()
                self.assertEqual(dispatch(name, {"query": "q"}), ({"error": f"unknown tool: {name}"}, True))
                self.assertEqual(citations, [])
        self.search.assert_not_called()

    def test_refusal_is_logged_through_the_tool_trace(self):
        dispatch, _citations = app._make_dispatch()
        with mock.patch("builtins.print") as printed:
            dispatch("request_meeting", {"attendee_email": "a@b.com"})
        self.assertEqual(
            [c.args[0] for c in printed.call_args_list],
            ['TOOL {"tool": "request_meeting", "is_error": true}'],
        )

    def test_search_failure_is_a_tool_error(self):
        self.search.side_effect = RuntimeError("boom")
        dispatch, citations = app._make_dispatch()
        self.assertEqual(dispatch("search_docs", {"query": "q"}), ({"error": "tool failed"}, True))
        self.assertEqual(citations, [])

    def test_search_collects_deduplicated_citations(self):
        self.search.return_value = {"chunks": [{"source_url": "u1"}, {"source_url": "u1"}, {"source_url": "u2"}]}
        dispatch, citations = app._make_dispatch()
        _result, is_error = dispatch("search_docs", {"query": "q"})
        self.assertFalse(is_error)
        self.assertEqual(citations, ["u1", "u2"])
