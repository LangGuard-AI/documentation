---
sidebar_position: 6
title: Audit Log
description: View user and system actions, and configure SIEM forwarding
---

import ThemedImage from '@theme/ThemedImage';

# Audit Log

The audit log provides a tamper-proof record of all user and system actions in your LangGuard workspace.

**Navigation:** Settings > Audit Log (`/settings/audit`)

<ThemedImage
  alt="Audit Log"
  sources={{
    light: '/img/settings-audit-log-light.png',
    dark: '/img/settings-audit-log.png',
  }}
/>

## Overview

Every significant action in LangGuard is recorded in the audit log. This includes user activity, configuration changes, and system events — giving you a complete trail for compliance and security investigations.

## Viewing the Audit Log

The audit log displays events in reverse chronological order:

| Column | Description |
|--------|-------------|
| **Timestamp** | When the action occurred |
| **User** | Who performed the action |
| **Action** | What was done |
| **Resource** | The affected resource |
| **Details** | Additional context |

### Filtering

Narrow the audit log using filters:

- **User** — Filter by specific user
- **Action Type** — Filter by category of action
- **Date Range** — Select a specific time period

### Action Types

| Action Type | Examples |
|-------------|----------|
| **Authentication** | User login, SSO authentication, failed login attempts |
| **Policy Changes** | Policy created, updated, enabled, or disabled |
| **Integration Changes** | Integration added, modified, credentials updated |
| **Settings Changes** | Workspace settings updated, SSO configured |
| **User Management** | User invited, role changed, user removed |
| **API Key Events** | Key created, revoked |
| **Quarantine** | Agent quarantined, quarantine changed, released, expired, change refused. See [Agent quarantine actions](#agent-quarantine-actions). |

### Agent quarantine actions {#agent-quarantine-actions}

The category **Quarantine** holds the [Agent Quarantine](/features/agent-quarantine)
actions. The filter lists them also before the first one occurs.

| Action | Severity | When |
|--------|----------|------|
| `agent.quarantine_placed` | warning | An agent was quarantined |
| `agent.quarantine_updated` | info | The reason or the expiry changed, or a ban made an active quarantine ban-based |
| `agent.quarantine_released` | info | A quarantine was released |
| `agent.quarantine_expired` | info | A quarantine reached its expiry |
| `agent.quarantine_refused` | warning | LangGuard refused a place, change or release. The status is failure. |

The metadata of each entry has the surface (`ui`, `api`, `mcp`, `slack`, `approval` or
`expiry`). When the entry is about one quarantine, the metadata also has the quarantine
ID, the agent ID and name, the IDs of the bound identities, the reason and the expiry.
A refusal also has the `cause`:

| Cause | Meaning |
|-------|---------|
| `forbidden` | The caller is not an admin and does not use a Quarantine key |
| `self_release` | The calling key is one of the bound identities |
| `banned_agent` | The approval status Banned holds the quarantine |

The actor type of these entries is `user`, `api_key`, `slack_user` or `system`. The
filter also lists `agent.quarantine_bypass_detected`. LangGuard does not write this
action in this release.

[SIEM forwarding](#siem-forwarding) sends these entries as all other audit entries. Its
category filter also lists **Quarantine**.

## Exporting Audit Data

Export audit log entries for external analysis:

1. Apply any desired filters
2. Click **Export**
3. Select format (CSV or JSON)
4. Download the file

## SIEM Forwarding

Forward audit events to your external Security Information and Event Management (SIEM) system in real time.

### Configuring SIEM Forwarding

1. Navigate to **Settings > Audit Log**
2. Click **Configure SIEM Forwarding**
3. Enter your SIEM endpoint URL
4. Configure authentication (API key or bearer token)
5. Select which event types to forward
6. Click **Save**

### Supported Formats

Audit events are forwarded in JSON format compatible with common SIEM platforms:

- Splunk
- Datadog
- Elastic SIEM
- Microsoft Sentinel

### Testing the Connection

After configuring, click **Send Test Event** to verify your SIEM is receiving events correctly.

## Retention

Audit log entries are retained for the duration of your LangGuard subscription. Contact support for specific retention policy details.

## Best Practices

- **Review the audit log regularly** — Check for unexpected actions or unauthorized access
- **Enable SIEM forwarding** — Centralize audit events alongside your other security logs
- **Export before investigations** — Save a snapshot of relevant events before making changes
- **Use filters effectively** — Narrow by user and date range when investigating specific incidents
