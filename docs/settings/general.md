---
sidebar_position: 2
title: General Settings
description: Set your language, session timeouts, and view enforcement usage
---

# General Settings

The General page holds your own preferences. Administrators also see the session timeouts and the enforcement usage for the organization.

**Navigation:** Settings > General (`/settings/general`)

## Language

Select the language of the application. The options are **English** and **Français**. The choice applies to your account only.

## Session timeouts

Administrators only. This card does not show in a Databricks App deployment.

| Field | Description |
|-------|-------------|
| **Idle Timeout (minutes)** | The session expires after this many minutes of inactivity. |
| **Absolute Timeout (minutes)** | The session expires after this many minutes, whatever the activity. |

The values apply to all users in your organization. **Reset to Defaults** restores the platform defaults. For more information, see [Session Settings](/settings/session).

## Usage

Administrators only. Usage shows the number of enforcement decisions per month. The counts include decisions from agent hooks, the gateway, and Arbiter clients. The counts update about once per hour.

The chart shows the decisions per month for each enforcement point:

- **Agent hooks**
- **Gateway MCP**: decisions on MCP tool calls through the gateway.
- **Gateway chat**: decisions on LLM chat through the gateway.

The chart covers the 12 months up to the most recent month with decisions. Months are UTC calendar months.

The **Monthly totals** table lists only months with decisions, newest first, at most 12. Each month has a status:

| Status | Meaning |
|--------|---------|
| **Open** | The current month. The count continues. |
| **Closing** | A past month whose total is not frozen yet. |
| **Closed** | The month is closed and its total is frozen. |
| **Late additions** | Decisions arrived after the month closed. The table shows the frozen total and the late count. |

A month closes a few hours after it ends. To download the hourly counts of one month, select **CSV** in the **Export** column. Each export is recorded in the audit log.
