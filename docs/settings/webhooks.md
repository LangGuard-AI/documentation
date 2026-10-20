---
sidebar_position: 4
title: Alert Destinations
description: Send LangGuard events to webhooks, PagerDuty, or a Slack channel
---

# Alert Destinations

Alert destinations send LangGuard events to external systems. A destination can be an HTTP webhook, PagerDuty, or a Slack channel.

**Navigation:** Settings > Alert Destinations (`/settings/webhooks`)

## Event types

The page has one section for each event type. A destination receives only the events of the section where you add it.

| Section | Event | Sent when |
|---------|-------|-----------|
| **Policy Violation Alerts** | `policy.violation` | A policy violation occurs. |
| **Tag Change Alerts** | `entity.tag.changed` | A tag on an entity is added, updated, or removed. |
| **Approval Alerts** | `entity.approval.changed` | The approval status of an entity changes (approved, not approved, or banned). |
| **Discovery Alerts** | `entity.discovered` | LangGuard discovers a new AI entity (agent, tool, model, and more). |
| **Escalation Requests** | `escalation.pending` | A policy escalation creates a pending approval request. |
| **Escalation Decisions** | `escalation.decided` | An approval request is approved, denied, or expired. |

Approval requests always show on the Monitoring page. Escalation destinations are an additional one-way channel. See [Approvals and remembered rules](/policies/approvals).

## Add a destination

1. Go to **Settings > Alert Destinations**.
2. In the section for the event type, click **Add Destination**.
3. Enter a **Name** and, optionally, a **Description**.
4. Select the **Destination Type** and complete its fields (see below).
5. For **Policy Violation Alerts** only: in **Policies**, select the policies that send alerts to this destination, or select **All Policies**.
6. Click **Create Destination**.

### Webhook (HTTP)

| Field | Description |
|-------|-------------|
| **Endpoint URL** | The URL that receives an HTTP POST for each event. |
| **HTTP Headers (optional)** | Custom headers to send with each request, for example `Authorization` or `X-API-Key`. Use them to authenticate LangGuard to your endpoint. |

### PagerDuty

| Field | Description |
|-------|-------------|
| **Integration / Routing Key** | The 32-character integration key of an Events API v2 integration on a PagerDuty service. |
| **Region** | **United States (default)** or **European Union**. |

Click **Send test alert** and make sure that the test succeeds before you create the destination. The test opens a test incident in PagerDuty.

When a policy violation is set to Resolved or False positive in LangGuard, LangGuard resolves the PagerDuty incident.

### Slack (alert channel)

Enter the **Incoming Webhook URL** of an incoming webhook in your Slack workspace. The URL starts with `https://hooks.slack.com/`. This channel is one-way. It only posts notifications.

## Approval alerts and mirroring

If no approval destination exists, LangGuard sends approval status changes to your tag change destinations.

**Mirror tag webhook configurations for approval events** copies each tag webhook as an approval webhook with the same endpoint, headers, and retry settings. Clear the box to delete the copies. The box is available only when one or more tag webhooks exist.

## Manage destinations

Each section lists its destinations with these columns: **Name**, **Destination**, **Headers**, **Status**, **Last Delivery**, and **Enabled**.

| Status | Meaning |
|--------|---------|
| **Healthy** | The last delivery succeeded. |
| **Failed** | The last delivery failed. |
| **Pending** | No delivery has occurred yet. |
| **Disabled** | The destination is turned off. |

The status shows the result of the last delivery only. Use the **Enabled** switch to stop or start deliveries without deleting the destination. Open the row menu to **Test**, **Edit**, or **Delete** a destination. A test updates the status.

## Webhook requests

LangGuard sends each event as an HTTP POST with a JSON-RPC 2.0 body. The `method` is `langguard.` followed by the event type, for example `langguard.policy.violation`. Each section on the page shows an example payload for its event type.

```json
{
  "jsonrpc": "2.0",
  "method": "langguard.policy.violation",
  "params": {
    "violation_id": "viol_abc123",
    "timestamp": "2025-02-04T12:00:00.000Z",
    "policy": {
      "id": "pol_xyz789",
      "name": "PII Detection",
      "slug": "pii-detection",
      "mode": "enforce",
      "severity": "high",
      "category": "data-protection"
    },
    "violation": {
      "message": "PII detected in model output",
      "evidence_snippet": "...email: john@example.com..."
    },
    "agent": {
      "name": "CustomerServiceBot",
      "type": "assistant",
      "approval_status": "approved"
    },
    "model": { "name": "gpt-4", "provider": "openai" },
    "metadata": { "trace_id": "trace_123abc", "integration_id": "int_456def" }
  }
}
```

Each request has these headers, plus your custom headers:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-LangGuard-Event` | The event type, for example `policy.violation` |
| `X-LangGuard-Timestamp` | The send time, in milliseconds since the Unix epoch |

LangGuard does not sign requests. To authenticate requests, add a secret header to the destination and check it in your endpoint.

### Retries

If a delivery fails, LangGuard retries it up to 3 times. The wait between attempts starts at 5 seconds and doubles each time, to a maximum of 60 seconds. Each attempt times out after 30 seconds.

## Best practices

- Use HTTPS endpoints. Payloads can contain evidence from your traces.
- Add an authentication header and check it in your endpoint.
- Return a 2xx status quickly. Process the event after you respond.
