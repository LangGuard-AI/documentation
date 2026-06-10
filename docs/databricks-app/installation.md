---
sidebar_position: 2
title: Installation
description: Deploy LangGuard to your Databricks workspace from the self-contained app artifact
---

# Installing the Databricks App

LangGuard is delivered as a single, self-contained deployment artifact
(`langguard-<version>-<hash>.zip`) plus a **license key**. The deploy script
handles everything — Unity Catalog setup, Lakebase provisioning, secrets, and the
app deployment itself.

## Prerequisites

Install and authenticate these tools on the machine you deploy from:

| Tool | Purpose |
|------|---------|
| [Databricks CLI](https://docs.databricks.com/dev-tools/cli/install.html) | Deploys the app bundle and configures the workspace. Must be authenticated (`databricks configure`). |
| Python 3.8+ | Runs the OpenCITE sidecar and the installer. |
| Node.js 18+ with `npx` | Runs the first-time workspace installer. |

### Workspace permissions

The identity you deploy with needs:

- **Workspace admin or metastore admin** (for Unity Catalog setup)
- **`CREATE CATALOG` / `CREATE SCHEMA`** (or a pre-created catalog)
- **SQL warehouse access** (Serverless or Pro)
- **Databricks Apps** — permission to create and manage apps
- **Secrets** — permission to create scopes and write secrets

### External storage for OTLP ingestion

Databricks' native OTLP ingestion (Zerobus) requires the trace tables to live in a
Unity Catalog schema backed by **customer-managed external storage** (S3, ADLS, or
GCS). Metastore-managed storage is rejected by the OTLP endpoint. The installer
detects your external locations and lets you pick one; if none exist, create an
[external location](https://docs.databricks.com/connect/unity-catalog/external-locations.html)
first.

:::tip Optional — AI Gateway cost tracking
For cross-endpoint token and cost aggregates, grant the app's service principal
`SELECT` on `system.ai_gateway.usage` (plus `USE CATALOG` / `USE SCHEMA` on the
`system` catalog). The `system` catalog is owned at the account tier, so this
requires an **account or metastore admin**, and the `system.ai_gateway` schema
must be enabled on the metastore. If you skip it, deployment still succeeds — you
lose only the `system.ai_gateway.usage` aggregate. Per-request inference-table
traces and LangGuard-proxy (`/v1/chat`) capture are unaffected.
:::

## Deploy

Unzip the artifact and run the deploy script with the license key you were given
and your Databricks CLI profile:

```bash
unzip langguard-<version>-<hash>.zip -d langguard
cd langguard
bash deploy.sh <LICENSE_KEY> -p <PROFILE>
```

- `<LICENSE_KEY>` — the key shown when your build was created. The artifact only
  accepts the key it was built for; the wrong key is rejected immediately.
- `-p <PROFILE>` — a Databricks CLI profile from `~/.databrickscfg`. The script
  resolves the workspace host from the profile (or from `DATABRICKS_HOST`).

The script runs a set of pre-flight checks, prints a deployment summary, and asks
you to confirm before making any changes.

### What the deploy does

On a **fresh workspace** the script runs the interactive installer first:

1. **Unity Catalog** — creates the catalog and two schemas:
   - `langguard` — views, annotations, discovery status
   - `langguard_otel` — OTEL span/log ingestion tables
2. **Delta tables** — `langguard_otel_spans`, `langguard_otel_logs`,
   `trace_annotations`, `discovery_status`
3. **Lakebase** — provisions the Lakebase PostgreSQL database and applies
   migrations (you provide the connection string when prompted)
4. **Secrets** — creates the `langguard-secrets` scope and stores connection
   strings and security keys
5. **Deploy** — deploys the app via Databricks Asset Bundle (`databricks bundle deploy`)
6. **Permissions** — grants the app's service principal the Unity Catalog and
   Lakebase permissions it needs
7. **Start** — starts the LangGuard app

On a **subsequent deploy** (the `langguard-secrets` scope already exists) the
installer is skipped: the script redeploys the bundle, refreshes the Unity Catalog
views (`langguard_traces`, `langguard_observations`, `langguard_trace_stats`),
re-grants permissions, and restarts the app.

### AWS S3 storage credentials (if needed)

On AWS workspaces that need S3 storage credentials for native OTEL ingestion, run:

```bash
npx tsx scripts/databricks-setup-storage.ts
```

## Secrets

LangGuard reads its configuration from the `langguard-secrets` secret scope. The
installer populates these for you:

| Key | Description |
|-----|-------------|
| `license-key` | Per-build license key (passed to `deploy.sh`) |
| `databricks-catalog` | Unity Catalog catalog name |
| `sql-warehouse-path` | SQL warehouse HTTP path |
| `lakebase-connection-string` | Lakebase PostgreSQL connection string |
| `lakebase-endpoint-path` | Lakebase endpoint (for OAuth credential generation) |
| `session-secret` | Web session secret |
| `encryption-key` | Data encryption key |
| `proxy-shared-key` | Shared bearer token between an AI Gateway endpoint and the LangGuard `/v1/chat` proxy (see [AI Gateway](/databricks-app/ai-gateway)) |

## After deployment

Open the app from the Databricks **Apps** page (or the URL printed at the end of
the deploy). Authentication uses the Databricks Apps OIDC proxy — LangGuard maps
your Databricks identity automatically, and `CAN_MANAGE` on the app grants the
LangGuard **admin** role.

![The langguard app running as a Databricks App](/img/databricks-apps.png)

## Next steps

- [AI Gateway Enforcement](/databricks-app/ai-gateway) — guard your model endpoints
- [Data Capture](/databricks-app/data-capture) — how activity is collected
- [Unity Catalog Data](/databricks-app/unity-catalog) — where your data lives
