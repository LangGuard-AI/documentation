---
sidebar_position: 1
title: Databricks App
description: Run LangGuard natively inside your Databricks workspace — install, AI Gateway enforcement, and where your data lives in Unity Catalog
---

# LangGuard on Databricks

LangGuard can be deployed **natively inside your own Databricks workspace** as a
[Databricks App](https://docs.databricks.com/dev-tools/databricks-apps/). In this
mode LangGuard runs entirely on your Databricks compute, stores all of its data in
**your** Unity Catalog and Lakebase Postgres, and governs the agents and model
endpoints running in your workspace — **no data ever leaves your Databricks
account**.

This is different from the [Databricks *integration*](/integrations/databricks)
for the LangGuard SaaS, which forwards activity from a Databricks workspace to the
hosted LangGuard service. If you need full data residency, the Databricks App is
the right choice.

:::info Single-tenant by design
A Databricks App deployment serves **one** tenant — your workspace. There is no
multi-tenant routing; the app is provisioned, secured, and billed per workspace.
:::

## Why run LangGuard as a Databricks App

- **Data residency** — traces, policies, violations, and discovered entities live
  in your Unity Catalog and Lakebase, governed by your existing UC permissions.
- **Native AI Gateway enforcement** — LangGuard can sit inline in front of your
  Mosaic AI Gateway / Model Serving endpoints and **allow, notify, or block**
  model calls in real time. See [AI Gateway Enforcement](/databricks-app/ai-gateway).
- **Automatic capture** — model and agent activity is captured from the workspace
  with no per-agent instrumentation, via native OTLP ingestion and AI Gateway
  inference tables. See [Data Capture](/databricks-app/data-capture).
- **Unity Catalog governance** — every LangGuard table is a real UC object you can
  query, secure, and audit. See [Unity Catalog Data](/databricks-app/unity-catalog).

## Architecture at a glance

The app ships as a single, self-contained artifact that runs three coordinated
processes inside the Databricks App container:

```
        ┌──────────────────────── Databricks App container ────────────────────────┐
        │                                                                           │
        │   LangGuard server (Deno-compiled binary)                                 │
        │     • Web UI + API            • Policy enforcement (/v1/chat proxy)        │
        │     • OTLP exporter           • GUI-aware pollers                          │
        │                                                                           │
        │   OPA sidecar                 OpenCITE sidecar                             │
        │     • Rego policy eval          • Agent / tool / model / MCP discovery     │
        │                                                                           │
        └───────────┬───────────────────────────────┬───────────────────────────────┘
                    │                                │
       Lakebase PostgreSQL                   Unity Catalog (Delta)
       (metadata, policies,                  (OTEL spans/logs, trace
        entities, config)                     views, annotations)
```

Unlike the LangGuard SaaS pipeline, the Databricks App has **no `otel-ingest`
service and no inbound webhook chain**. Instead the app:

1. **Enforces** model calls that route through its `/v1/chat/completions` proxy
   (the [AI Gateway](/databricks-app/ai-gateway) path), and
2. **Exports** the resulting traces as OTLP directly to your workspace's native
   Databricks OTLP endpoint, which lands them in a Unity Catalog Delta table, and
3. **Polls** those Delta tables (plus AI Gateway inference tables and
   `system.ai_gateway.usage`) to surface traces, run discovery, and evaluate
   policies.

## How your model activity is captured

LangGuard captures activity through three complementary paths so it can see
everything in the workspace — even agents it doesn't directly proxy:

| Path | What it covers | Enforcement |
|------|----------------|-------------|
| **`/v1/chat` proxy** (Guarded Endpoints) | Calls routed through a LangGuard-wrapped AI Gateway endpoint | Real-time allow / notify / **block** |
| **Native OTLP export** | Traces LangGuard emits for proxied calls | Observe |
| **Pollers** | AI Gateway inference tables + `system.ai_gateway.usage` for endpoints that don't proxy | Observe |

See [Data Capture](/databricks-app/data-capture) for the full flow.

## Next steps

- [Installation](/databricks-app/installation) — deploy the app to your workspace
- [AI Gateway Enforcement](/databricks-app/ai-gateway) — guard your model endpoints
- [Data Capture](/databricks-app/data-capture) — how traces and activity are collected
- [Unity Catalog Data](/databricks-app/unity-catalog) — where everything is stored
