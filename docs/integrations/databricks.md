---
sidebar_position: 3
title: Databricks
description: Connect a Databricks workspace to LangGuard to discover agents and import traces
---

import ThemedImage from '@theme/ThemedImage';

# Databricks Integration

[Databricks](https://databricks.com) is a unified analytics and AI platform.
LangGuard connects to a Databricks workspace to **discover the AI agents, models,
and tools** running there and to **import traces** for monitoring and policy
evaluation.

:::tip Running LangGuard *inside* Databricks?
This page covers connecting a Databricks workspace to the **LangGuard SaaS**. If
you want LangGuard deployed natively in your own workspace — with full data
residency, real-time AI Gateway enforcement, and storage in your Unity Catalog —
see the [**Databricks App**](/private-install/databricks-app) section instead.
:::

## Overview

The integration lets LangGuard:

- **Discover AI assets** — agents, models, tools, and MCP servers active in the workspace
- **Import traces** — from MLflow tracing, Databricks Genie, and AI Gateway activity
- **Track token usage and cost** — including the AI Gateway usage table
- **Apply governance policies** — every imported trace is evaluated against your policies

## Architecture

LangGuard's discovery service does the work of connecting to Databricks and
extracting traces. LangGuard stores your connection credentials and configuration.
At each sync, LangGuard sends the configuration to the discovery service. The
discovery service connects to your workspace, reads the activity since the last sync,
and gives the traces and the discovered entities to LangGuard. LangGuard then stores
the traces and evaluates them against your policies. The discovery service does not
store your credentials.

```
LangGuard (stores credentials + config)
       │  at each sync: the configuration of the integration
       ▼
Discovery service ──► Databricks workspace
       │                (MLflow traces, Genie, AI Gateway usage)
       │  traces + discovered entities
       ▼
LangGuard  →  policy evaluation  →  Trace Explorer / Data Catalog
```

A running discovery service is required for this integration. The discovery service
connects only to an `https` workspace URL at a public address.

## Prerequisites

- A Databricks workspace
- A workspace access token (PAT) with permission to read traces and, optionally, a
  SQL Warehouse for usage/catalog queries
- For AI Gateway cost tracking: access to the `system.ai_gateway.usage` table

## Setup

1. Navigate to **Settings → Integrations** in LangGuard.
2. Click **Add Integration** and select **Databricks**.
3. Enter your connection details:

| Field | Description | Required |
|-------|-------------|----------|
| **Name** | Friendly name (e.g. "Production Databricks") | Yes |
| **Host URL** | Workspace URL (e.g. `https://dbc-xxxx.cloud.databricks.com`) | Yes |
| **Access Token** | Databricks personal access token | Yes |
| **SQL Warehouse ID** | Warehouse for usage/catalog queries | No |

4. (Optional) Configure discovery options:
   - **Lookback window** — how many days of history to import on first sync (default: 90)
   - **AI Gateway usage table** — the table to read cross-endpoint token/cost from
     (e.g. `system.ai_gateway.usage`)
5. Click **Test Connection** — LangGuard validates the credentials through the
   discovery service.
6. Click **Save**.
After the first sync, discovered agents and models appear in
[Discovery](/features/discovery) and the [Data Catalog](/features/data-catalog),
and imported traces appear in the [Trace Explorer](/features/trace-explorer).

## What gets imported

| Capability | Details |
|------------|---------|
| **Traces** | MLflow traces, Genie activity, and AI Gateway requests, mapped into LangGuard's unified trace schema |
| **Entities** | Agents, models, tools, and MCP servers discovered from trace activity |
| **Usage & cost** | Token usage and cost, including from the AI Gateway usage table |

Discovery and trace import are **incremental** — after the initial lookback sync,
LangGuard only fetches activity since the last sync.

## Multiple workspaces

Connect multiple Databricks workspaces by adding a separate integration for each,
with descriptive names (e.g. "Databricks – Production", "Databricks – Dev"). Each
integration's assets are scoped to that connection.

## Troubleshooting

### Discovery service not available

**Message**: *"Discovery service is not available."*

The Databricks integration requires a running discovery service. If you see this,
the service is unreachable — contact your administrator or LangGuard support. On a
private install, the discovery service runs in the `otel-ingest` pods.

### Connection validation failed

1. Verify the **Host URL** includes `https://` and is correct. A message with
   `host is not allowed` means that the host does not resolve to a public address,
   for example a workspace that LangGuard reaches only through a private endpoint.
2. Confirm the access token hasn't expired and has the required permissions.
3. If using a SQL Warehouse, ensure it is running and the token can access it.

### No traces appearing

1. Confirm the workspace actually has MLflow traces / Genie / AI Gateway activity
   in the lookback window.
2. Allow time for the first sync to complete (a 90-day lookback can take a while).
3. Check the integration's sync status in **Settings → Integrations**.

### Missing AI Gateway cost

Ensure the **AI Gateway usage table** is configured and the token has `SELECT` on
`system.ai_gateway.usage` (plus `USE CATALOG` / `USE SCHEMA` on the `system`
catalog).

---

## Next steps

- [Databricks App](/private-install/databricks-app) — run LangGuard natively inside Databricks
- [Discovery & Inventory](/features/discovery) — browse discovered agents and models
- [Data Catalog](/features/data-catalog) - Browse synced entities
- [Policies](/policies) - Apply governance to imported traces
