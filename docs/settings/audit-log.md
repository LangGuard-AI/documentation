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
