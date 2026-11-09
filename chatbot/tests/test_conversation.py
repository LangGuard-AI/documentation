import conversation
import system_prompt


class FakeBedrock:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def converse(self, **kwargs):
        self.calls.append(kwargs)
        return self.responses.pop(0)


def _end_turn(text):
    return {"stopReason": "end_turn",
            "output": {"message": {"role": "assistant", "content": [{"text": text}]}}}


def _tool_use(name, tool_input, tool_use_id="t1"):
    return {"stopReason": "tool_use",
            "output": {"message": {"role": "assistant", "content": [
                {"text": "Let me check."},
                {"toolUse": {"toolUseId": tool_use_id, "name": name, "input": tool_input}},
            ]}}}


def _run(client, dispatch, messages=None):
    reply, stop, _usage = conversation.run_turn(
        client, "test-model", messages if messages is not None else
        [{"role": "user", "content": [{"text": "hi"}]}],
        dispatch, system_prompt.build_system(), system_prompt.build_tool_config(),
    )
    return reply, stop


def test_plain_reply():
    client = FakeBedrock([_end_turn("Hey there!")])
    reply, stop = _run(client, lambda n, i: ({}, False))
    assert reply == "Hey there!"
    assert stop == "end_turn"
    assert len(client.calls) == 1


def test_tool_use_then_reply():
    client = FakeBedrock([
        _tool_use("search_docs", {"query": "policies"}),
        _end_turn("Policies work like this."),
    ])
    calls = []

    def dispatch(name, tool_input):
        calls.append((name, tool_input))
        return {"chunks": [{"text": "doc", "source_url": "https://docs.langguard.ai/x/"}]}, False

    messages = [{"role": "user", "content": [{"text": "how do policies work?"}]}]
    reply, stop = _run(client, dispatch, messages)
    assert reply == "Policies work like this."
    assert calls == [("search_docs", {"query": "policies"})]
    assert len(messages) == 4
    tr = messages[2]["content"][0]["toolResult"]
    assert tr["toolUseId"] == "t1"
    assert "status" not in tr
    assert len(client.calls) == 2
    assert client.calls[1]["messages"] is messages


def test_tool_error_marks_status():
    client = FakeBedrock([
        _tool_use("search_docs", {"query": "x"}),
        _end_turn("That search failed."),
    ])
    messages = [{"role": "user", "content": [{"text": "search"}]}]
    reply, _ = _run(client, lambda n, i: ({"error": "tool failed"}, True), messages)
    assert reply == "That search failed."
    assert messages[2]["content"][0]["toolResult"]["status"] == "error"


def test_max_iterations_fallback():
    client = FakeBedrock([_tool_use("search_docs", {"query": f"q{i}"}, f"t{i}")
                          for i in range(conversation.MAX_ITERATIONS)])
    reply, stop = _run(client, lambda n, i: ({"chunks": []}, False))
    assert stop == "max_iterations"
    assert reply == conversation.FALLBACK_REPLY


def test_empty_text_gets_fallback():
    client = FakeBedrock([{"stopReason": "end_turn",
                           "output": {"message": {"role": "assistant", "content": []}}}])
    reply, _ = _run(client, lambda n, i: ({}, False))
    assert reply == conversation.FALLBACK_REPLY


def test_sanitize_history_basic():
    raw = [{"role": "user", "text": "a"}, {"role": "assistant", "text": "b"}]
    out = conversation.sanitize_history(raw)
    assert [m["role"] for m in out] == ["user", "assistant"]
    assert out[0]["content"] == [{"text": "a"}]


def test_sanitize_history_merges_and_trims():
    raw = [
        {"role": "assistant", "text": "orphan"},
        {"role": "user", "text": "one"},
        {"role": "user", "text": "two"},
        {"role": "assistant", "text": "reply"},
        {"role": "user", "text": "dangling"},
    ]
    out = conversation.sanitize_history(raw)
    assert [m["role"] for m in out] == ["user", "assistant"]
    assert out[0]["content"] == [{"text": "one"}, {"text": "two"}]


def test_sanitize_history_garbage():
    assert conversation.sanitize_history(None) == []
    assert conversation.sanitize_history("nope") == []
    assert conversation.sanitize_history([{"role": "system", "text": "x"}, 42, {"role": "user"}]) == []


def test_thinking_blocks_stripped():
    msg = {"role": "assistant", "content": [{"text": "<thinking>secret reasoning here</thinking>\n\nUse the Helm chart."}]}
    assert conversation._text_of(msg) == "Use the Helm chart."
    msg2 = {"role": "assistant", "content": [{"text": "Hello <thinking>oops"}]}
    assert "thinking" not in conversation._text_of(msg2).lower()


def test_usage_summed_across_calls():
    call1 = _tool_use("search_docs", {"query": "x"})
    call1["usage"] = {"inputTokens": 100, "outputTokens": 20}
    call2 = _end_turn("done")
    call2["usage"] = {"inputTokens": 150, "outputTokens": 30}
    client = FakeBedrock([call1, call2])
    reply, stop, usage = conversation.run_turn(
        client, "m", [{"role": "user", "content": [{"text": "hi"}]}],
        lambda n, i: ({"chunks": []}, False),
        system_prompt.build_system(), system_prompt.build_tool_config())
    assert reply == "done"
    assert usage == {"in": 250, "out": 50}


def test_usage_zero_when_absent():
    reply, stop, usage = conversation.run_turn(
        FakeBedrock([_end_turn("hi")]), "m", [{"role": "user", "content": [{"text": "x"}]}],
        lambda n, i: ({}, False),
        system_prompt.build_system(), system_prompt.build_tool_config())
    assert usage == {"in": 0, "out": 0}


def test_tool_config_offers_only_search_docs():
    names = [t["toolSpec"]["name"] for t in system_prompt.build_tool_config()["tools"]]
    assert names == ["search_docs"]
