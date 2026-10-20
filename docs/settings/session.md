---
sidebar_position: 8
title: Session Settings
description: Configure session timeout and idle timeout durations
---

# Session Settings

Control how long user sessions stay active. Administrators only. Session timeouts are not available in a Databricks App deployment.

**Navigation:** Settings > General, **Session Timeouts** card (`/settings/general`)

## Timeouts

| Field | Description |
|-------|-------------|
| **Idle Timeout (minutes)** | The session expires after this many minutes of inactivity. |
| **Absolute Timeout (minutes)** | The session expires after this many minutes, whatever the activity. |

Each value must be between 15 and 43,200 minutes (30 days). The values apply to all users in your organization.

1. Go to **Settings > General**.
2. In **Session Timeouts**, enter the two values.
3. Click **Save**.

When a session expires, the user must sign in again. To go back to the platform defaults, click **Reset to Defaults**. The card shows the platform defaults below the fields.

## Best practices

- Set a short idle timeout (15 to 30 minutes) if your users handle sensitive data.
- Set an absolute timeout that matches your security policy for re-authentication.
