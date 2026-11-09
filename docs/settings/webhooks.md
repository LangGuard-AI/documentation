---
sidebar_position: 4
title: Webhooks
description: Configure outbound webhooks for event notifications
---

import ThemedImage from '@theme/ThemedImage';

# Webhooks

Outbound webhooks let you send real-time notifications to external systems when events occur in LangGuard.

**Navigation:** Settings > Webhooks (`/settings/webhooks`)

<ThemedImage
  alt="Webhooks"
  sources={{
    light: '/img/settings-webhooks-light.png',
    dark: '/img/settings-webhooks.png',
  }}
/>

## Overview

Webhooks deliver HTTP POST requests to your configured endpoints whenever specific events occur. Use them to integrate LangGuard with alerting systems, ticketing tools, Slack bots, or custom automation.

## Creating a Webhook

1. Navigate to **Settings > Webhooks**
2. Click **Add Webhook**
3. Configure the webhook:
   - **URL** — The HTTPS endpoint to receive events
   - **Secret** — A shared secret for verifying webhook signatures
   - **Events** — Select which event types to subscribe to
4. Click **Save**

## Event Types

| Event | Description |
|-------|-------------|
| `policy.violation` | A policy violation was detected on a trace |
| `entity.tag.changed` | A tag was added to or removed from an entity |
| `entity.approval.changed` | An entity's approval status changed (approved, under review, blocked) |
| `entity.discovered` | A new AI asset was discovered |
| `agent.quarantine` | An agent was quarantined, its quarantine changed, or it was released (also by expiry). See [Agent quarantine events](#agent-quarantine-events). |

## Webhook Payload

Each webhook delivery includes:

```json
{
  "event": "policy.violation",
  "timestamp": "2026-03-17T14:30:00Z",
  "data": {
    "traceId": "tr_abc123",
    "policyName": "PII Detection",
    "severity": "critical",
    "message": "Email address detected in output"
  }
}
```

## Agent quarantine events {#agent-quarantine-events}

On the Webhooks settings page, add a destination in the section
**Agent Quarantine Alerts**. The event type is `agent.quarantine`. LangGuard sends a
JSON-RPC 2.0 message with one of two methods:

| Method | When | `params.change` |
|--------|------|-----------------|
| `langguard.agent.quarantined` | An agent was quarantined, or the reason or the expiry of an active quarantine changed | `placed` or `updated` |
| `langguard.agent.quarantine_released` | A quarantine was released. An expiry is a release with `quarantine.released_via` set to `expiry`. | `released` |

```json
{
  "jsonrpc": "2.0",
  "method": "langguard.agent.quarantined",
  "params": {
    "event_id": "c2d1e0f9-8a7b-4c6d-9e5f-4a3b2c1d0e9f",
    "timestamp": "2026-11-09T12:00:00.000Z",
    "event_type": "agent.quarantined",
    "change": "placed",
    "agent": { "id": "9f8e7d6c-5b4a-4321-8fed-cba987654321", "name": "billing-agent" },
    "identities": [
      { "entity_id": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "display_name": "Billing service account", "class": "nhi" }
    ],
    "quarantine": {
      "id": "0b7e6c1a-5f2d-4c3e-9a8b-1d2e3f4a5b6c",
      "status": "active",
      "reason": "Unexpected file deletions",
      "placed_at": "2026-11-09T12:00:00.000Z",
      "placed_by_type": "user",
      "placed_by_id": "6e5d4c3b-2a19-4f8e-8d7c-6b5a4f3e2d1c",
      "placed_via": "ui",
      "expires_at": null,
      "released_at": null,
      "released_by_type": null,
      "released_by_id": null,
      "released_via": null,
      "release_note": null,
      "via_approval": false,
      "revision": 0,
      "url": "https://<your-instance>/catalog?drawer=entity&entityId=9f8e7d6c-5b4a-4321-8fed-cba987654321"
    },
    "actor": { "type": "user", "id": "6e5d4c3b-2a19-4f8e-8d7c-6b5a4f3e2d1c" },
    "surface": "ui"
  }
}
```

- `event_type` is `agent.quarantined` or `agent.quarantine_released`.
- `identities` has the ID, the display name and the class of each bound identity. The
  identity keys (email addresses, API key IDs, device IDs) are never sent.
- `quarantine.url` opens the agent in LangGuard. The link needs a sign-in.
- `placed_via` is `ui`, `api`, `mcp`, `slack` or `approval`. `released_via` and
  `surface` (the surface of the change that sent the event) can also be `expiry`.
- `actor.type` is `user`, `api_key`, `slack_user` or `system`.
- An update sends `langguard.agent.quarantined` again for the same `quarantine.id`, so
  your system always has the current reason and expiry.

## Signature Verification

LangGuard signs each webhook payload using HMAC-SHA256 with your configured secret. The signature is included in the `X-LangGuard-Signature` header.

Verify the signature in your handler to ensure requests are authentic:

```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

## Managing Webhooks

### Enable/Disable

Toggle individual webhooks on or off without deleting them. Disabled webhooks stop receiving events but retain their configuration.

### Delivery History

View recent webhook deliveries:

- **Timestamp** — When the delivery was attempted
- **Event** — The event type
- **Status** — Success (2xx) or failure (4xx/5xx)
- **Response** — HTTP status code from your endpoint

### Retry Logic

Failed deliveries are retried automatically:

- Up to 3 retry attempts
- Exponential backoff between retries
- Webhooks are disabled automatically after sustained failures

## Best Practices

- **Use HTTPS endpoints** — Webhook payloads may contain sensitive data
- **Verify signatures** — Always validate the `X-LangGuard-Signature` header
- **Respond quickly** — Return a 2xx status within 5 seconds; process asynchronously if needed
- **Monitor delivery history** — Check for failed deliveries regularly
