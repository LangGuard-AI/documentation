"""Orchestrator Lambda — the chatbot's HTTP entry point.

POST /chat  body: { message, history: [{role, text}] }
returns:    200 { reply, sources: [url] }
            429 / 502 { error, reply }
            400 { error }

Flow: validate -> rate limit (before any Bedrock spend) -> rebuild Converse
messages from the widget-held history -> run the tool-use loop -> reply.
CORS (incl. preflight) is handled by the HTTP API's CorsConfiguration.
"""
from __future__ import annotations

import json
import os
import time
import traceback

import boto3

import conversation
import rate_limit
import retrieval
import system_prompt

bedrock = boto3.client("bedrock-runtime")
_ratelimit_table = boto3.resource("dynamodb").Table(os.environ["RATE_LIMIT_TABLE"])

MODEL_ID = os.environ["BEDROCK_MODEL_ID"]
MAX_MESSAGE_CHARS = 2000
MAX_HISTORY_TURNS = 12
MAX_TURN_SECONDS = 20  # stay under API Gateway's 30s integration ceiling
MAX_SOURCES = 4

BUSY_REPLY = "Too many requests right now. Wait a minute and try again."
ERROR_REPLY = "The assistant could not complete this request. Try again."
CAP_REPLY = "The assistant has reached its usage limit. Try again later or browse the documentation directly."


def handler(event, _context):
    try:
        body = json.loads(event.get("body") or "{}")
    except (json.JSONDecodeError, RecursionError):
        return _resp(400, {"error": "invalid JSON body"})
    if not isinstance(body, dict):
        return _resp(400, {"error": "body must be a JSON object"})

    raw_message = body.get("message")
    message = raw_message.strip() if isinstance(raw_message, str) else ""
    if not message:
        return _resp(400, {"error": "message is required"})
    if len(message) > MAX_MESSAGE_CHARS:
        return _resp(400, {"error": f"message must be under {MAX_MESSAGE_CHARS} characters"})

    ip = ((event.get("requestContext") or {}).get("http") or {}).get("sourceIp", "0.0.0.0")
    if not rate_limit.allow_request(_ratelimit_table, ip):
        return _resp(429, {"error": "rate_limited", "reply": BUSY_REPLY})
    # Hard spend cap: once the month or day hits its dollar ceiling, Bedrock is
    # not called at all. A normal reply, so the widget shows it in the thread.
    if not rate_limit.budget_ok(_ratelimit_table):
        return _resp(200, {"reply": CAP_REPLY, "sources": []})

    messages = conversation.sanitize_history(body.get("history"), MAX_HISTORY_TURNS) + [
        {"role": "user", "content": [{"text": message}]}
    ]

    dispatch, citations = _make_dispatch()
    try:
        reply, stop, usage = conversation.run_turn(
            bedrock,
            MODEL_ID,
            messages,
            dispatch,
            system_prompt.build_system(),
            system_prompt.build_tool_config(),
            deadline=time.time() + MAX_TURN_SECONDS,
        )
    except Exception:
        print(traceback.format_exc())
        return _resp(502, {"error": "upstream", "reply": ERROR_REPLY})

    rate_limit.record_cost(_ratelimit_table, usage.get("in", 0), usage.get("out", 0))
    print(json.dumps({"stop": stop, "turns": len(messages), "sources": len(citations),
                      "tok_in": usage.get("in"), "tok_out": usage.get("out")}))
    return _resp(200, {"reply": reply, "sources": citations[:MAX_SOURCES]})


def _make_dispatch():
    """Tool dispatcher for one request; collects citations."""
    citations: list = []

    def dispatch(name: str, tool_input: dict):
        if name != system_prompt.SEARCH_DOCS:
            result, is_error = {"error": f"unknown tool: {name}"}, True
            _log_tool(name, tool_input, result, is_error)
            return result, is_error
        try:
            result = retrieval.search_docs(str(tool_input.get("query") or "")[:500])
            for chunk in result.get("chunks", []):
                url = chunk.get("source_url")
                if url and url not in citations:
                    citations.append(url)
            _log_tool(name, tool_input, result, False)
            return result, False
        except Exception:
            print(f"dispatch({name}) failed: {traceback.format_exc()}")
            return {"error": "tool failed"}, True

    return dispatch, citations


def _log_tool(name: str, tool_input: dict, result: dict, is_error: bool):
    """Compact tool-call trace for CloudWatch."""
    out = {"tool": name, "is_error": is_error}
    if name == system_prompt.SEARCH_DOCS:
        out["query"] = str((tool_input or {}).get("query") or "")[:120]
        out["chunks"] = len(result.get("chunks", []))
    print("TOOL " + json.dumps(out, default=str)[:800])


def _resp(status: int, payload: dict):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload),
    }
