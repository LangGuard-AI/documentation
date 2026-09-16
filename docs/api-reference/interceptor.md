---
sidebar_position: 2
title: Interceptor API
description: The JSON-RPC policy decision endpoint that gateways and Arbiter daemons call to get an allow, block, or ask verdict for an MCP tool call
---

# Interceptor API

The Interceptor API is LangGuard's **policy decision point (PDP)**. Gateways, proxies,
and the Arbiter daemon call it for every MCP tool call and receive a deterministic
verdict: allow, block, or ask a human.

It implements the **MCP Interceptors extension** (SEP-2624, capability namespace
`io.modelcontextprotocol/interceptors`) exactly, so any MCP gateway that speaks the
extension can use LangGuard as a validation interceptor without custom integration.
LangGuard-specific inputs and outputs ride in a namespaced `langguard` object so the
spec fields stay pure.

```
POST https://<your-instance>/api/interceptor
Content-Type: application/json
Authorization: Bearer lgr_...
```

The endpoint is a single **JSON-RPC 2.0** endpoint with two methods:

| Method | Purpose |
|--------|---------|
| `interceptors/list` | Discovery. Returns the interceptor descriptor. |
| `interceptor/invoke` | The one decision method. Evaluates a tool call and returns a verdict. |

Requests up to 1 MB are accepted.

## Authentication

Send an active `lgr_` [API key](/settings/api-keys) as a bearer token. Keys with the
**Arbiter** or **Ingest** scope are the intended credentials for this endpoint. Read,
write, and admin keys still authenticate but are logged as legacy use and may be
rejected in a future release.

The tenant is always resolved from the key, never from the request body.

Authentication failures are reported at the **HTTP** layer, not as JSON-RPC errors, so
machine clients can run their normal bearer-refresh logic:

```json
HTTP 401
{ "error": "Authentication required. Provide API key via Authorization: Bearer header." }
```

:::note Databricks App
When LangGuard runs as a Databricks App, requests arriving through the Apps OIDC proxy
are authenticated by the proxy's `x-forwarded-email` header instead of a key.
:::

## `interceptors/list`

Returns the interceptors this PDP exposes. There is exactly one. Pass an optional
`event` to filter by hooked event.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "interceptors/list",
  "params": { "event": "tools/call" }
}
```

**Response**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "interceptors": [
      {
        "name": "policy-langguard.ai",
        "version": "2.0.0",
        "description": "LangGuard Policy Decision Point (PDP) — validates MCP calls against LangGuard policies",
        "type": "validation",
        "hooks": [{ "events": ["tools/call"], "phase": "both" }],
        "compat": { "minProtocol": "2024-11-05" },
        "mode": "enforce",
        "failOpen": false
      }
    ]
  }
}
```

The descriptor tells a caller everything it needs to know about the contract:

- **`type: validation`** — the PDP never mutates a call; it only judges it.
- **`hooks`** — it evaluates `tools/call` in both the `request` and `response` phase.
- **`mode: enforce`** and **`failOpen: false`** — a failed validation blocks, and engine
  trouble is reported as a blocking error rather than a silent pass.

## `interceptor/invoke`

Evaluates one MCP tool call. The same method serves two callers, selected by
`config.langguard.surface`:

| Surface | Who calls it | What `payload` carries |
|---------|--------------|------------------------|
| **Gateway** (default) | MCP gateways, the LiteLLM guardrail, the Claude Apps Gateway sidecar, and any SEP-2624 client | The MCP message under interception |
| **Hooks** (`"surface": "hooks"`) | The Arbiter daemon inside Claude Code, Codex, Cursor, Antigravity, or shell | The tool name, plus hook-specific fields under `config.langguard` |

### Common parameters

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Interceptor name. Either `policy-langguard.ai` or the vendor-neutral `default`. Anything else returns `-32602`. |
| `event` | yes | The MCP event, normally `tools/call`. |
| `phase` | yes | `request` (before the tool runs) or `response` (after it returns). |
| `payload` | yes | The MCP message: `{ "method": "tools/call", "params": { "name": "<tool>", "arguments": { ... } } }`. |
| `timeoutMs` | no | Upper bound for the evaluation. Exceeding it returns `-32000`. |
| `config.langguard` | no | LangGuard-specific inputs, listed per surface below. |
| `context` | no | SEP invocation context: `principal` (`type`, `id`, `claims`), `traceId`, `spanId`, `timestamp`, `sessionId`. |

### Gateway surface

This is the default when `config.langguard.surface` is absent. It is the path governed by
the [Enforcement Mode](/settings/enforcement-mode) setting.

**Identity.** LangGuard reads caller identity from two places. Values under
`config.langguard` win; `context.principal.claims` is a lower-precedence fallback for
`user_id`, `ai_app_id`, `department`, and `environment` only. The `agent_name` field is
taken only from `config.langguard` and must be one of `claude`, `cursor`, `codex`,
`shell`, or `antigravity`; any other value is silently dropped to prevent spoofing.
`context.principal.id` becomes the call's caller identity, and `context.traceId` is used
as the call ID for correlation (one is generated if absent).

**Optional `config.langguard` fields**

| Field | Description |
|-------|-------------|
| `agent_name` | Harness name from the allowlist above |
| `agent_type` | Free-form platform label used for provider attribution, for example `vertex` |
| `user_id`, `ai_app_id`, `department`, `environment` | Identity enrichment recorded on the decision trace |
| `session_id` | Conversation identity, distinct from the per-call trace ID. When present, LangGuard accumulates session history so sequence-aware policies can fire. |
| `session_actions` | Up to 50 prior actions in this session, each `{ tool, phase, verdict, ts, category?, capabilities? }`. Validated and re-capped server-side. |

**Example request**

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "interceptor/invoke",
  "params": {
    "name": "policy-langguard.ai",
    "event": "tools/call",
    "phase": "request",
    "payload": {
      "method": "tools/call",
      "params": {
        "name": "github.create_pull_request",
        "arguments": { "repo": "acme/payments", "title": "Bump deps" }
      }
    },
    "timeoutMs": 2000,
    "config": {
      "langguard": {
        "agent_name": "claude",
        "user_id": "jane@acme.com",
        "environment": "production",
        "session_id": "conv-8f1c"
      }
    },
    "context": {
      "principal": { "type": "user", "id": "jane@acme.com" },
      "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
    }
  }
}
```

**Example response (allowed)**

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "result": {
    "interceptor": "policy-langguard.ai",
    "type": "validation",
    "phase": "request",
    "durationMs": 18,
    "validation": { "valid": true, "severity": "info", "messages": [] },
    "langguard": {
      "status": "success",
      "violations": [],
      "verdict": "ALLOW",
      "applied_rule": "approved_low_risk",
      "bundle_revision": "sha256:9c1e…"
    }
  }
}
```

**Example response (blocked)**

```json
{
  "jsonrpc": "2.0",
  "id": 43,
  "result": {
    "interceptor": "policy-langguard.ai",
    "type": "validation",
    "phase": "request",
    "durationMs": 21,
    "validation": {
      "valid": false,
      "severity": "error",
      "messages": [
        { "path": "no-prod-writes", "message": "Write to production repo blocked", "severity": "error" }
      ]
    },
    "langguard": {
      "status": "block",
      "violations": [
        { "policy_id": "no-prod-writes", "status": "block", "details": "Write to production repo blocked" }
      ],
      "verdict": "BLOCK",
      "applied_rule": "enforce_violation",
      "reason": "Policy violation in enforce mode: Write to production repo blocked",
      "bundle_revision": "sha256:9c1e…"
    }
  }
}
```

**Gateway result fields under `langguard`**

| Field | Description |
|-------|-------------|
| `status` | Legacy wire triple: `success`, `notify`, or `block`. An escalated call is reported as `block`. |
| `violations` | Policy violations, each `{ policy_id, status, details }` where `status` is `notify` or `block`. |
| `verdict` | The decision core's true outcome: `ALLOW`, `BLOCK`, or `ASK`. |
| `applied_rule` | Which rule of the verdict table fired. See [how verdicts are decided](/settings/arbiter-management#how-verdicts-are-decided). |
| `reason` | Human-readable reason. Absent on `ALLOW`. |
| `bundle_revision` | Revision of the policy bundle that produced the decision. |
| `policy_escalation` | Present only when the call was blocked pending human approval. See below. |

**Escalation.** When a policy's response is *Escalate*, the call is blocked on the wire
and `langguard.policy_escalation` carries a trimmed envelope:

```json
"policy_escalation": {
  "decision": "block",
  "reason": "escalation_pending",
  "referenceId": "LG-7CAJ81",
  "message": "Approval requested. Reference LG-7CAJ81."
}
```

`reason` is `escalation_pending` (an approval request was created) or `remembered_deny`
(a previous decision on this credential is being reapplied). `referenceId` is present
when a request was queued and can be quoted to an approver. Internal approval IDs are
never exposed. Approvals are handled on the Monitoring page or in Slack, and the
authenticated API key is what a remembered decision binds to.

### Hooks surface

Set `config.langguard.surface` to `"hooks"`. This is the door the Arbiter daemon uses.
It is documented here for completeness; the daemon and harness plugins already speak it.

**Required fields**

| Field | Location | Description |
|-------|----------|-------------|
| `session_id` | `config.langguard.session_id` or `context.sessionId` | The harness session |
| tool name | `payload.params.name` | Normalized dotted tool name |
| `phase` | `config.langguard.phase` | Hook phase: `enforce`, `evidence`, or `verify`. Note this is separate from the SEP `phase` param. |

Missing fields return `-32602` with the messages `session_id is required`,
`tool is required (normalized dotted string)`, or `phase must be one of: enforce, evidence, verify`.

**Optional `config.langguard` fields**

| Field | Description |
|-------|-------------|
| `raw_tool` | The harness's original tool name before normalization |
| `args_hash` | Hash of the tool arguments |
| `content` | `{ "args": "...", "output": "..." }` for content-inspecting policies. Each string is clipped to the tenant's PII scan limit. |
| `session_actions` | Prior session actions, same shape as the gateway surface |
| `local_bundle_revision` | The bundle revision the daemon evaluated locally, if any |
| `install_id`, `daemon_version` | Device identity, which feeds [Arbiter Management](/settings/arbiter-management) |
| `agent_name`, `user_id`, `ai_app_id`, `department`, `environment` | Identity enrichment; `agent_name` is allowlisted as above |

**Hooks result fields under `langguard`**

| Field | Description |
|-------|-------------|
| `verdict` | `ALLOW`, `BLOCK`, or `ASK` |
| `reason` | Present on `BLOCK` and `ASK` |
| `block` | Set on `evidence` and `verify` phases when a hard violation was found |
| `violations` | As on the gateway surface |
| `bundle_revision` | Bundle revision used |
| `evaluated` | `local` or `remote`, indicating where the verdict was computed |

Every hooks-door call also updates the device's traffic counters and last-seen time in
Arbiter Management.

## How verdicts map to the spec

The SEP-2624 severity model has no notion of "ask". Only `error` blocks, so LangGuard
projects its three-way verdict conservatively:

| `langguard.verdict` | `validation.valid` | `validation.severity` |
|---------------------|--------------------|-----------------------|
| `ALLOW` with no violations | `true` | `info` |
| `ALLOW` with notify-only violations (gateway) | `true` | `warn` |
| `BLOCK` | `false` | `error` |
| `ASK` | `false` | `error` |

A caller that can pause for human approval should read `langguard.verdict` and treat
`ASK` accordingly. A caller that only understands the spec fields fails closed, which is
the intended default.

Each entry in `validation.messages` corresponds to one violation, with `path` set to the
policy ID and `severity` set to `warn` for notify violations or `error` for blocking ones.

## Errors

| Code | Meaning |
|------|---------|
| `-32602` | Invalid params: unknown interceptor name, bad `phase`, missing `payload`, or a missing hooks-surface field |
| `-32603` | Internal error. Treat as fail-closed: the Arbiter daemon maps this to `ASK`. |
| `-32000` | The evaluation exceeded `timeoutMs` |

Errors use the standard JSON-RPC envelope:

```json
{ "jsonrpc": "2.0", "id": 42, "error": { "code": -32602, "message": "interceptor \"foo\" not found" } }
```

A request that is a JSON-RPC notification (no `id`) receives HTTP 204 with no body.

## What was removed in 2.0.0

The Interceptor 2.0.0 contract removed the earlier bespoke surfaces. If you integrated
before July 2026, migrate as follows:

| Removed | Replacement |
|---------|-------------|
| JSON-RPC `interceptor/validate`, `interceptor/verdict`, `interceptor/context` | `interceptor/invoke` |
| `POST /api/arbiter/verdict` | `interceptor/invoke` with `config.langguard.surface: "hooks"` |
| `POST /api/arbiter/context` | SCREEN context now ships inside the policy bundle from `GET /api/arbiter/bundle` |
| JSON-RPC auth error `-32001` | HTTP 401 |

The REST management plane under `/api/arbiter` (heartbeat, command acknowledgement,
whoami, bundle) is unchanged and is used by the daemon, not by gateways.

## Related

- [Enforcement Mode](/settings/enforcement-mode) — Shadow versus Enforce on the gateway surface
- [Arbiter Management](/settings/arbiter-management) — the verdict table and the daemon fleet
- [LiteLLM](/integrations/litellm#real-time-guardrails) — a built-in caller of this API
- [API Keys](/settings/api-keys) — minting an Arbiter or Ingest key
