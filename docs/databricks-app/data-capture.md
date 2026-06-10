---
sidebar_position: 4
title: Data Capture
description: How the LangGuard Databricks App captures model and agent activity across your workspace
---

# Data Capture

The Databricks App captures activity through three complementary paths so it can
see **everything in the workspace** — including agents and endpoints it doesn't
directly proxy. All three converge on Unity Catalog Delta tables that the app
reads from.

## The three capture paths

### 1. `/v1/chat` proxy (real-time, enforced)

Calls routed through a [Guarded Endpoint](/databricks-app/ai-gateway) are evaluated
pre- and post-call and can be **blocked**. For each call, LangGuard builds an OTLP
trace and exports it (path 2 below). This is the only path that can enforce.

### 2. Native OTLP export

LangGuard acts as an **OTLP exporter**, sending spans directly to your workspace's
native Databricks OTLP ingestion endpoint:

```
LangGuard app
   │  build OTLP trace (GenAI semantic conventions + langguard.* attributes)
   │  protobuf-encode
   ▼
POST https://<DATABRICKS_HOST>/api/2.0/otel/v1/traces
   Authorization: Bearer <app service-principal token>
   Content-Type:  application/x-protobuf
   X-Databricks-UC-Table-Name: <catalog>.<otel_schema>.langguard_otel_spans
   ▼
Unity Catalog Delta table  <catalog>.<otel_schema>.langguard_otel_spans
```

A few important properties of this path:

- **Protobuf only** — the Databricks OTLP endpoint rejects JSON.
- **App service principal** — OTLP writes need the `all-apis` scope, which user
  OBO tokens don't carry, so the app SP credential is used.
- **External storage required** — the target schema must be backed by
  customer-managed external storage (see [Installation](/databricks-app/installation)).
- **Fire-and-forget** — export never blocks the response path; failures are
  retried once and otherwise dropped, so enforcement latency is unaffected.

### 3. Pollers (everything else in the workspace)

To capture agents and endpoints that **don't** route through the LangGuard proxy,
the app polls Unity Catalog directly:

- **OTEL trace & log pollers** — read newly ingested rows from
  `langguard_otel_spans` / `langguard_otel_logs` and run them through agent
  detection, entity resolution, and policy evaluation.
- **AI Gateway inference tables** — the `langguard_inference_traces` view UNIONs
  every discovered `*_payload` inference table, so plain Databricks served
  agents/endpoints with inference tables enabled are captured even without OTLP.
- **`system.ai_gateway.usage`** — OpenCITE polls this system table for
  cross-endpoint token/cost aggregates (optional; requires the `system` catalog
  grant described in [Installation](/databricks-app/installation)).

### GUI-aware polling cadence

Polling backs off when nothing is happening and speeds up when you're using the
app, so it stays responsive without hammering your SQL warehouse:

| Condition | Interval |
|-----------|----------|
| Data found on last poll | 30s (base) |
| App UI active, no new data | 60s |
| Idle, no new data | backs off exponentially up to 20 min |
| UI activity detected | immediate poll |

The intervals are tunable via `DATABRICKS_POLL_INTERVAL_MS`,
`DATABRICKS_POLL_GUI_INTERVAL_MS`, and `DATABRICKS_POLL_MAX_INTERVAL_MS`.

## Discovery

As traces are processed, the **OpenCITE** sidecar discovers the agents, models,
tools, MCP servers, and downstream systems in your workspace and populates the
[Data Catalog](/features/data-catalog) and [Agent Discovery](/features/discovery).
No per-agent instrumentation is required.

## Next steps

- [Unity Catalog Data](/databricks-app/unity-catalog) — where captured data is stored
- [Trace Explorer](/features/trace-explorer) — view captured traces
- [Discovery & Inventory](/features/discovery) — the agents and models discovered
