---
sidebar_position: 3
title: Agent Quarantine API
description: REST endpoints to quarantine an agent, change or release a quarantine, and read the quarantine state
---

# Agent Quarantine API

Use these endpoints to quarantine an agent, to change or release a quarantine, and to
read the quarantine state. For the concepts, see [Agent Quarantine](/features/agent-quarantine).

```
https://<your-instance>/api
```

The Swagger UI of your instance at `/api-docs` shows these routes, except the preview,
under the tag **Agent Quarantine**.

## Authentication

Send an `lgr_` [API key](/settings/api-keys) as a bearer token:

```
Authorization: Bearer lgr_...
```

The LangGuard app uses its session cookie for the same routes.

| Operation | API key | Session |
|-----------|---------|---------|
| Place, change, release | Scope **Quarantine** | Role **admin** |
| List, get, per-agent state, preview | Scope **Read**, **Write**, **Admin** or **Quarantine** | Role **viewer** or higher |

Keys with the **Admin** or the **Write** scope cannot place, change or release a
quarantine. A key with the **Quarantine** scope can use only these routes and the
[MCP quarantine tools](/settings/mcp-server#agent-quarantine-tools). On every other
route it gets HTTP 403 with the message `This API key may only be used to quarantine agents.`

## Conventions

- Request fields use snake case, for example `expires_at`. The routes also accept
  `expiresAt`.
- The quarantine object in a response uses camel case.
- Times are ISO-8601 strings in UTC.
- `reason` and `note` are trimmed. `reason` must have 1 to 1000 characters. `note`
  can have at most 1000 characters.
- `revision` is the revision of the quarantine that you read. A change or a release
  with a different revision fails with `409 STALE_REVISION`.

## The quarantine object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Quarantine ID |
| `agentEntityId` | string | Catalog entity ID of the agent |
| `agentName` | string | Name of the agent at placement |
| `agentKeys` | string[] | The agent part: `entity:<external id>`, `name:<name>` and `app:<name>`, in lower case. The display name adds its own `name:` and `app:` keys. |
| `identities` | object[] | The bound identities. Each is `{ entityId, displayName, class, keys }`. `class` is `human`, `nhi` or `obo`. `keys` are the identity keys, for example an email address or `apikey:<id>`. Empty when the agent had no linked identity. |
| `status` | string | `active` or `released` |
| `reason` | string | Why the agent is quarantined |
| `placedAt` | string | When the quarantine started |
| `placedByType` | string | `user`, `api_key`, `slack_user` or `system` |
| `placedById` | string | ID of the user, of the API key, of the LangGuard user linked to the Slack user, or of the system actor |
| `placedVia` | string | `ui`, `api`, `mcp`, `slack` or `approval` |
| `expiresAt` | string or null | Automatic release time. `null` means until released. |
| `releasedAt` | string or null | When the quarantine was released |
| `releasedByType` | string or null | As `placedByType` |
| `releasedById` | string or null | As `placedById` |
| `releasedVia` | string or null | `ui`, `api`, `mcp`, `slack`, `approval` or `expiry` |
| `releaseNote` | string or null | The note of the release |
| `revision` | integer | Increases on each change |
| `blockedCount` | integer | Blocked calls. LangGuard updates it every 30 seconds. |
| `lastBlockedAt` | string or null | The last blocked call |
| `bypassCount` | integer | Reserved. `0` in this release. |
| `lastBypassAt` | string or null | Reserved. `null` in this release. |
| `viaApproval` | boolean | `true` when the approval status **Banned** placed the quarantine. Only a change of the approval status releases it. |

## Place a quarantine

```
POST /api/agent-quarantines
```

**Request body**

| Field | Required | Description |
|-------|----------|-------------|
| `agent` | yes | `{ "id": "<entity id>" }` or `{ "name": "<agent name>" }`. The name must match the name or the display name of one agent. The match is exact and does not use case. |
| `reason` | yes | 1 to 1000 characters |
| `expires_at` | no | A time in the future. Omit it, or send `null`, for "until released". |

```json
{
  "agent": { "name": "billing-agent" },
  "reason": "Unexpected file deletions, INC-4411",
  "expires_at": "2026-11-10T12:00:00Z"
}
```

**Responses**

| Status | Body |
|--------|------|
| `201` | `{ "quarantine": { ... }, "already_quarantined": false }` |
| `200` | The agent was already quarantined: `{ "quarantine": { ... }, "already_quarantined": true }`. The active quarantine does not change. The request reason and expiry are not applied. |
| `400` | `INVALID_INPUT` |
| `403` | `FORBIDDEN` |
| `404` | `AGENT_NOT_FOUND` |
| `409` | `AMBIGUOUS_AGENT`, with up to 5 `candidates`, each `{ id, name }`. Send the request again with `agent.id`. |

**Example response (`201`)**

```json
{
  "quarantine": {
    "id": "0b7e6c1a-5f2d-4c3e-9a8b-1d2e3f4a5b6c",
    "agentEntityId": "9f8e7d6c-5b4a-4321-8fed-cba987654321",
    "agentName": "billing-agent",
    "agentKeys": [
      "entity:3e1c5a7b-9d2f-5b4e-8a6c-0f1e2d3c4b5a",
      "name:billing-agent",
      "app:billing-agent"
    ],
    "identities": [
      {
        "entityId": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
        "displayName": "Billing service account",
        "class": "nhi",
        "keys": ["apikey:7f3c2b1a-0e9d-4c8b-a7f6-e5d4c3b2a190"]
      }
    ],
    "status": "active",
    "reason": "Unexpected file deletions, INC-4411",
    "placedAt": "2026-11-09T12:00:00.000Z",
    "placedByType": "api_key",
    "placedById": "5c4b3a29-1807-4f6e-9d5c-4b3a29180716",
    "placedVia": "api",
    "expiresAt": "2026-11-10T12:00:00.000Z",
    "releasedAt": null,
    "releasedByType": null,
    "releasedById": null,
    "releasedVia": null,
    "releaseNote": null,
    "revision": 0,
    "blockedCount": 0,
    "lastBlockedAt": null,
    "bypassCount": 0,
    "lastBypassAt": null,
    "viaApproval": false
  },
  "already_quarantined": false
}
```

## List quarantines

```
GET /api/agent-quarantines?status=active
```

| Parameter | Description |
|-----------|-------------|
| `status` | `active` (default), `released` or `all`. Any other value gives `400 INVALID_INPUT`. |

**Response `200`:** `{ "quarantines": [ ... ] }`. The newest quarantine is first. The
list has at most 500 items.

## Get one quarantine

```
GET /api/agent-quarantines/{id}
```

**Responses:** `200` with `{ "quarantine": { ... } }`, or `404 QUARANTINE_NOT_FOUND`.

## Change a quarantine

Change the reason or the expiry of an active quarantine.

```
PATCH /api/agent-quarantines/{id}
```

**Request body**

| Field | Required | Description |
|-------|----------|-------------|
| `revision` | yes | The revision that you read |
| `reason` | no | The new reason, 1 to 1000 characters |
| `expires_at` | no | A new time in the future. `null` removes the expiry. |

Send at least one of `reason` and `expires_at`, else the answer is `400 INVALID_INPUT`
with the message `nothing to change`.

```json
{ "reason": "Unexpected file deletions, INC-4411 and INC-4412", "revision": 0 }
```

**Responses**

| Status | Body |
|--------|------|
| `200` | `{ "quarantine": { ... } }` |
| `400` | `INVALID_INPUT` |
| `403` | `FORBIDDEN`, or `SELF_RELEASE` when the calling key is one of the bound identities |
| `404` | `QUARANTINE_NOT_FOUND` |
| `409` | `NOT_ACTIVE`, `STALE_REVISION`, or `BANNED_AGENT` when you set an expiry on a ban-based quarantine |

## Release a quarantine

```
POST /api/agent-quarantines/{id}/release
```

**Request body**

| Field | Required | Description |
|-------|----------|-------------|
| `revision` | yes | The revision that you read |
| `note` | no | At most 1000 characters |

```json
{ "note": "False alarm. Verified with the owner.", "revision": 1 }
```

**Responses**

| Status | Body |
|--------|------|
| `200` | `{ "quarantine": { ... } }` with `status` `released` |
| `400` | `INVALID_INPUT` |
| `403` | `FORBIDDEN`, or `SELF_RELEASE` when the calling key is one of the bound identities |
| `404` | `QUARANTINE_NOT_FOUND` |
| `409` | `NOT_ACTIVE` (the body also has `quarantine`), `STALE_REVISION`, or `BANNED_AGENT` |

A ban-based quarantine (`viaApproval: true`) is released only when you change the
approval status of the agent. See [Banned agents](/features/agent-quarantine#banned-agents).

## Quarantine state of one agent

```
GET /api/agents/{entityId}/quarantine
```

**Response `200`**

```json
{
  "current": { "id": "0b7e6c1a-5f2d-4c3e-9a8b-1d2e3f4a5b6c", "status": "active", "...": "..." },
  "history": [ { "id": "0b7e6c1a-5f2d-4c3e-9a8b-1d2e3f4a5b6c", "...": "..." } ],
  "devices": {
    "confirmed": 3,
    "unconfirmed": [
      {
        "instanceId": "4d3c2b1a-0f9e-4d8c-b7a6-958473625140",
        "label": "mbp-****.local",
        "confirmedAt": null,
        "lastSeenAt": "2026-11-09T11:58:00.000Z"
      }
    ]
  }
}
```

| Field | Description |
|-------|-------------|
| `current` | The active quarantine, or `null` |
| `history` | All quarantines of the agent, newest first, at most 50 |
| `devices.confirmed` | The number of Arbiter devices that reported the active quarantine in their heartbeat |
| `devices.unconfirmed` | Arbiter devices that were active for this agent in the last 24 hours and did not confirm |

When the agent has no active quarantine, `devices` is `{ "confirmed": 0, "unconfirmed": [] }`.
An unknown `entityId` gives `200` with `current: null` and an empty `history`.

## Preview a quarantine

```
GET /api/agents/{entityId}/quarantine/preview
```

Returns the identities that a placement binds now, and the active quarantine. Nothing
is written.

**Responses:** `200` with `{ "agentEntityId", "agentName", "identities", "current" }`,
or `404 AGENT_NOT_FOUND`.

## Errors

A quarantine error has this body:

```json
{
  "error": "STALE_REVISION",
  "code": "STALE_REVISION",
  "message": "The quarantine changed. Reload and try again."
}
```

Read the `code` field. For `FORBIDDEN`, `error` is `Forbidden`.

Some errors add fields: `candidates` on `AMBIGUOUS_AGENT`, and `quarantine` on a
`NOT_ACTIVE` answer of the release route and on most `STALE_REVISION` answers.

| Status | Code | When |
|--------|------|------|
| `400` | `INVALID_INPUT` | A field is missing or not valid. Examples: `agent.id or agent.name is required`, `reason must be 1-1000 characters`, `expires_at must be in the future`, `revision is required`. |
| `401` | | No session and no API key: `{ "error": "Authentication required", "message": "You must be logged in to access this resource" }`. A key that is not valid, revoked or expired gets `{ "error": "Invalid API key", "message": "..." }`. |
| `403` | `FORBIDDEN` | The caller cannot change quarantines. A key gets the message `This operation requires an API key with the 'quarantine' scope.` A session gets `admin access required`. |
| `403` | `SELF_RELEASE` | The calling key is one of the bound identities of the quarantine |
| `404` | `AGENT_NOT_FOUND` | No agent has this ID or name |
| `404` | `QUARANTINE_NOT_FOUND` | No quarantine has this ID |
| `409` | `AMBIGUOUS_AGENT` | More than one agent has this name |
| `409` | `NOT_ACTIVE` | The quarantine is already released |
| `409` | `STALE_REVISION` | The quarantine changed after you read it |
| `409` | `BANNED_AGENT` | The approval status **Banned** holds the quarantine. The message is `Change the approval status to release this agent.` |
| `500` | `INTERNAL_ERROR` | An unexpected error |

LangGuard records `FORBIDDEN`, `SELF_RELEASE` and a `BANNED_AGENT` release refusal in the
[Audit Log](/settings/audit-log#agent-quarantine-actions) as `agent.quarantine_refused`.

## What the blocked caller receives

These are the answers of the LangGuard enforcement points for a quarantined agent. The
answer never contains the reason or the actor.

**Chat** (AI Gateway `/aigateway/v1/chat/completions` and `/aigateway/v1/messages`,
Databricks App `/v1/chat/completions`):
HTTP `403`.

```json
{
  "error": {
    "type": "policy_violation",
    "code": "agent_quarantined",
    "message": "This agent is quarantined. Contact your administrator.",
    "violations": [{ "policy_id": "agent_quarantine", "status": "block" }]
  }
}
```

`type` is `policy_violation`, as in the other policy blocks of the chat completions
routes. The messages route returns the same body. It does not have the top-level
`"type": "error"` of the other errors of that route.

**LiteLLM guardrail:**

```json
{ "action": "BLOCKED", "blocked_reason": "Agent quarantined" }
```

**Interceptor API, gateway surface** (MCP tool calls): `validation.valid` is `false` and
`validation.severity` is `error`, in every Enforcement Mode. Under `langguard`:

```json
{
  "status": "block",
  "violations": [
    {
      "policy_id": "agent_quarantine",
      "status": "block",
      "details": "This agent is quarantined. Contact your administrator."
    }
  ],
  "verdict": "BLOCK",
  "applied_rule": "agent_quarantine"
}
```

**Interceptor API, hooks surface** (Arbiter): `verdict` is `BLOCK` and `reason` is
`LangGuard: this agent is quarantined. Contact your administrator.` The answer is the
same in cooperative mode and in strict mode. `bundle_revision` is `agent_quarantine`.

**When the quarantine state is unknown.** If LangGuard cannot read the quarantine state
and has no earlier copy, the chat, guardrail and gateway answers are the usual
"policy engine unreachable" blocks. For the guardrail, this is
`{ "action": "BLOCKED", "blocked_reason": "Policy evaluation failed" }`. The hooks
surface answers `ASK` with the reason `Policy engine unreachable`.

## Arbiter device contract

The Arbiter daemon and the plugins use these interfaces. You do not call them yourself.
They authenticate with the `lgr_` key of the device.

**Request headers** on the bundle poll and on the self check. All are optional.

| Header | Value |
|--------|-------|
| `x-langguard-ai-app-id` | The registered AI app ID of the device |
| `x-langguard-harness` | The harnesses of the device, separated by commas: `claude`, `codex`, `cursor`, `antigravity`, `shell`. LangGuard reads at most 5. |
| `x-langguard-user-id` | The user ID that the device reports |

**Bundle poll.** Each answer of `GET /api/arbiter/bundle` (`200`, `304` and `503`) has the header
`x-langguard-quarantine`. The value is `none`, or `<quarantine id>;<expiresAt>`. The
part after `;` is empty when the quarantine has no expiry. LangGuard leaves the header
out when the state is unknown, because `none` removes the device marker.

**Self check.**

```
GET /api/arbiter/quarantine/self
```

| Status | Body |
|--------|------|
| `200` | `{ "quarantined": true, "id": "<quarantine id>", "expiresAt": "<time or null>" }` |
| `200` | `{ "quarantined": false }` |
| `401` | No usable key |
| `429` | More than 120 requests in one minute for one key |
| `503` | `{ "error": "quarantine_state_unknown" }`. Also when the request names no harness and no registered AI app ID. |

**Hooks verdicts.** Each hooks verdict has `langguard.quarantine`: `{ "id", "expiresAt" }`
when the device is quarantined, or `null`. LangGuard leaves the field out when the
state is unknown.

**Heartbeat.** The daemon sends `quarantine: { "id": "<quarantine id>" }` or
`quarantine: null` in its heartbeat. This is the device confirmation.
