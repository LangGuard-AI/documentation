"""The Bedrock Converse tool-use loop.

`run_turn` is dependency-injected (client + dispatch callable) so the loop is
unit-testable with a fake Bedrock client. The loop:

    converse -> stopReason "tool_use"? -> run tools -> append results -> repeat
             -> "end_turn" (or anything else) -> return the text

Cache points are stripped and the call retried once if the model/region
rejects them (ValidationException), so prompt caching is an optimization,
never an outage.
"""
from __future__ import annotations

import re
import time

from botocore.exceptions import ClientError


MAX_ITERATIONS = 5
FALLBACK_REPLY = "I could not produce an answer. Rephrase the question and try again."


def run_turn(
    client,
    model_id: str,
    messages: list,
    dispatch,
    system_blocks: list,
    tool_config: dict,
    max_tokens: int = 1024,
    deadline: float = None,
):
    """Run one user turn to completion. Returns (reply_text, stop_reason, usage).

    `usage` is {"in": int, "out": int} — Bedrock input/output token counts summed
    across every Converse call this turn made (a tool-use turn makes several), used
    by the caller to enforce the spend cap. `dispatch(name, input_dict)` ->
    (result_dict, is_error). `messages` is mutated in place (assistant turns + tool
    results are appended).
    """
    usage = {"in": 0, "out": 0}
    for _ in range(MAX_ITERATIONS):
        resp = _converse(client, model_id, system_blocks, tool_config, messages, max_tokens)
        u = resp.get("usage") or {}
        usage["in"] += int(u.get("inputTokens") or 0)
        usage["out"] += int(u.get("outputTokens") or 0)
        msg = resp["output"]["message"]
        messages.append(msg)
        stop = resp.get("stopReason")

        if stop == "tool_use" and (deadline is None or time.time() < deadline):
            results = []
            for block in msg.get("content", []):
                tu = block.get("toolUse")
                if not tu:
                    continue
                result, is_error = dispatch(tu["name"], tu.get("input") or {})
                tool_result = {
                    "toolUseId": tu["toolUseId"],
                    "content": [{"json": result}],
                }
                if is_error:
                    tool_result["status"] = "error"
                results.append({"toolResult": tool_result})
            if results:
                messages.append({"role": "user", "content": results})
                continue

        text = _text_of(msg)
        return (text or FALLBACK_REPLY), stop, usage

    return FALLBACK_REPLY, "max_iterations", usage


def sanitize_history(raw, max_turns: int = 12, max_chars: int = 4000) -> list:
    """Widget-held history -> alternating Converse messages (text only, capped).

    Merges consecutive same-role entries, drops anything malformed, ensures the
    list starts with a user turn and ends with an assistant turn (the caller
    appends the new user message after this).
    """
    if not isinstance(raw, list):
        return []
    cleaned = []
    for item in raw[-max_turns:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        text = str(item.get("text") or "").strip()[:max_chars]
        if role not in ("user", "assistant") or not text:
            continue
        if cleaned and cleaned[-1]["role"] == role:
            cleaned[-1]["content"].append({"text": text})
        else:
            cleaned.append({"role": role, "content": [{"text": text}]})
    while cleaned and cleaned[0]["role"] != "user":
        cleaned.pop(0)
    if cleaned and cleaned[-1]["role"] == "user":
        cleaned.pop()
    return cleaned


_THINK_RE = re.compile(r"<thinking\b[^>]*>.*?</thinking>", re.S | re.I)


def _text_of(msg) -> str:
    text = "".join(b.get("text", "") for b in msg.get("content", []) if "text" in b)
    # Nova emits <thinking> reasoning in the output text.
    text = _THINK_RE.sub("", text)
    text = re.sub(r"</?thinking\b[^>]*>", "", text, flags=re.I)
    return text.strip()


def _converse(client, model_id, system_blocks, tool_config, messages, max_tokens):
    kwargs = dict(
        modelId=model_id,
        system=system_blocks,
        messages=messages,
        toolConfig=tool_config,
        inferenceConfig={"maxTokens": max_tokens},
    )
    try:
        return client.converse(**kwargs)
    except ClientError as exc:
        code = getattr(exc, "response", {}).get("Error", {}).get("Code", "")
        if code == "ValidationException" and _has_cache_points(system_blocks, tool_config):
            print("conversation: cachePoint rejected; retrying without prompt cache")
            kwargs["system"] = [b for b in system_blocks if "cachePoint" not in b]
            kwargs["toolConfig"] = {
                "tools": [t for t in tool_config["tools"] if "cachePoint" not in t]
            }
            return client.converse(**kwargs)
        raise


def _has_cache_points(system_blocks, tool_config) -> bool:
    return any("cachePoint" in b for b in system_blocks) or any(
        "cachePoint" in t for t in tool_config.get("tools", [])
    )
